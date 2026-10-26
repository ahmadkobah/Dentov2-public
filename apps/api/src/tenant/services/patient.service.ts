import type { Connection, QueryFilter } from 'mongoose';
import type { IPatient } from '../models/patient.model.js';
import { getPatientModel } from '../models/patient.model.js';
import { searchHash, decryptField, isEncryptedString } from '../../utils/encryption.js';
import { ApiError } from '../../utils/api-response.js';
import { regexContains } from './search.helpers.js';

// Defensive decrypt for lean docs — idempotent (decryptField is a no-op when
// value is not in `iv:tag:cipher` form). Belt-and-braces in case the model's
// `post('find')` / `post('findOne')` hook does not fire (lean projection edge
// cases, populate paths, etc).
const PATIENT_ENCRYPTED_PATHS = [
  'nationalId',
  'phone',
  'email',
  'address',
  'emergencyContactName',
  'emergencyContactPhone',
  'notes',
] as const;
const PATIENT_MEDICAL_HISTORY_PATHS = [
  'previousDentalSurgeries',
  'otherConditions',
  'additionalNotes',
  'smokingFrequency',
  'currentMedications',
] as const;
const PATIENT_INSURANCE_PATHS = ['policyNumber', 'memberId'] as const;

function decryptIfNeededValue(v: unknown): unknown {
  if (typeof v === 'string' && isEncryptedString(v)) return decryptField(v);
  return v;
}

function decryptPatientLean<T>(doc: T): T {
  if (!doc || typeof doc !== 'object') return doc;
  const d = doc as Record<string, unknown>;
  for (const k of PATIENT_ENCRYPTED_PATHS) {
    if (k in d) d[k] = decryptIfNeededValue(d[k]);
  }
  const mh = d.medicalHistory as Record<string, unknown> | undefined;
  if (mh && typeof mh === 'object') {
    for (const k of PATIENT_MEDICAL_HISTORY_PATHS) {
      if (k in mh) mh[k] = decryptIfNeededValue(mh[k]);
    }
  }
  const ins = d.insurance as Record<string, unknown> | undefined;
  if (ins && typeof ins === 'object') {
    for (const k of PATIENT_INSURANCE_PATHS) {
      if (k in ins) ins[k] = decryptIfNeededValue(ins[k]);
    }
  }
  // populate('familyLinks.relatedPatientId', ...) brings in nested patient docs
  const links = d.familyLinks as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(links)) {
    for (const link of links) {
      const rel = link.relatedPatientId as Record<string, unknown> | undefined;
      if (rel && typeof rel === 'object') decryptPatientLean(rel);
    }
  }
  return doc;
}
import type {
  CreatePatientInput,
  UpdatePatientInput,
  PatientQuery,
  TenantWebhookEvent,
} from '@dento/shared';
import { dispatchWebhook } from './webhook-dispatcher.js';
import { logger } from '../../utils/logger.js';

/**
 * Patient Service — Business logic for patient CRUD
 *
 * Encryption (C-1): PII / PHI fields (nationalId, phone, email, address,
 * emergency contact, notes, medical-history fields, insurance member/policy)
 * are encrypted at rest by the `fieldEncryptionPlugin` on the Patient schema.
 * Equality lookups on phone / email / nationalId go through the corresponding
 * `*Hash` companion fields (HMAC-SHA-256), populated by the same plugin.
 *
 * The service layer should pass plaintext into the model — the plugin handles
 * encrypt-on-write and decrypt-on-read transparently. Do NOT call `encryptField`
 * directly here; doing so would double-encrypt on save.
 */

export class PatientService {
  private Patient;
  private tenantDb: Connection;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
    this.Patient = getPatientModel(tenantDb);
  }

  // ── List Patients (paginated, searchable) ─────────────────

  async list(query: PatientQuery) {
    const { page, limit, search, gender, isActive, source, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    // Build filter
    const filter: QueryFilter<IPatient> = {};

    if (isActive !== undefined) {
      filter.isActive = isActive;
    } else {
      filter.isActive = true; // Default: only active
    }

    if (gender) filter.gender = gender;
    if (source) filter.source = source;

    if (search) {
      // Cleartext fields (name, patientCode) use case-insensitive regex.
      // Encrypted fields (phone / email) use deterministic HMAC-SHA-256 search
      // hashes for exact-match lookup — regex on AES-GCM ciphertext would never match.
      const orConditions: QueryFilter<IPatient>[] = [
        { 'firstName.en': regexContains(search) },
        { 'firstName.ar': regexContains(search) },
        { 'lastName.en': regexContains(search) },
        { 'lastName.ar': regexContains(search) },
        { patientCode: regexContains(search) },
      ];

      const hash = searchHash(search);
      if (hash) {
        // Equality lookup against indexed *Hash columns.
        orConditions.push(
          { phoneHash: hash } as QueryFilter<IPatient>,
          { emailHash: hash } as QueryFilter<IPatient>,
        );
      }

      filter.$or = orConditions;
    }

    // Build sort
    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [patients, total] = await Promise.all([
      this.Patient.find(filter)
        .select('-medicalHistory -familyLinks -insurance') // Exclude heavy embedded data from list
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      this.Patient.countDocuments(filter),
    ]);

    // Plugin's post('find') hook should decrypt PII on the lean docs; we also
    // run an idempotent defensive decrypt to guard against hook misses.
    for (const p of patients) decryptPatientLean(p);
    return {
      patients,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  // ── Get Patient by ID (full detail) ───────────────────────

  async getById(id: string) {
    const patient = await this.Patient.findById(id)
      .populate('familyLinks.relatedPatientId', 'firstName lastName patientCode phone')
      .lean();
    if (!patient) {
      throw ApiError.notFound('Patient');
    }
    // Plugin's post('findOne') hook should decrypt PII; defensive decrypt
    // ensures populated familyLinks and any missed paths are also handled.
    decryptPatientLean(patient);
    return patient;
  }

  // ── Create Patient ────────────────────────────────────────

  async create(data: CreatePatientInput, createdBy: string) {
    // Phase 4.1 — Duplicate detection on phone / email / nationalId.
    // Caller can set `duplicateOverride: true` to bypass.
    const { duplicateOverride, ...payload } = data as CreatePatientInput & {
      duplicateOverride?: boolean;
    };
    if (!duplicateOverride) {
      const matches = await this.findDuplicates({
        phone: payload.phone,
        email: payload.email,
        nationalId: payload.nationalId,
      });
      if (matches.length > 0) {
        throw new ApiError(
          409,
          'POSSIBLE_DUPLICATE',
          'A patient with matching phone, email, or national ID already exists',
          { matches },
        );
      }
    }

    // Plugin handles PII encryption + populates *Hash fields on save.
    const patient = await this.Patient.create({
      ...payload,
      createdBy,
    });

    // Re-fetch via lean() so the plugin's post-find decryption returns plaintext
    // for the webhook payload (mirrors how callers later read this record).
    const result = await this.Patient.findById(patient._id).lean<Record<string, unknown>>();

    // Dispatch webhook (non-blocking)
    this.fireWebhook('patient.created', { patientId: patient._id.toString(), ...result });

    return result;
  }

  /**
   * Phase 4.1 — Look up active patients matching any of the supplied identity
   * fields. Uses HMAC-SHA-256 search-hash columns (`phoneHash`, `emailHash`,
   * `nationalIdHash`) populated by the encryption plugin so equality lookups
   * remain index-backed even though the source columns are AES-GCM encrypted.
   */
  async findDuplicates(query: { phone?: string; email?: string; nationalId?: string }) {
    const or: QueryFilter<IPatient>[] = [];
    if (query.phone) {
      const h = searchHash(query.phone);
      if (h) or.push({ phoneHash: h } as QueryFilter<IPatient>);
    }
    if (query.email) {
      const h = searchHash(query.email);
      if (h) or.push({ emailHash: h } as QueryFilter<IPatient>);
    }
    if (query.nationalId) {
      const h = searchHash(query.nationalId);
      if (h) or.push({ nationalIdHash: h } as QueryFilter<IPatient>);
    }
    if (or.length === 0) return [];

    const matches = await this.Patient.find({ $or: or, isActive: true })
      .select('firstName lastName phone email patientCode nationalId')
      .limit(5)
      .lean();

    // Defensive decrypt — idempotent.
    for (const m of matches) decryptPatientLean(m);
    return matches;
  }

  // ── Update Patient ────────────────────────────────────────

  async update(id: string, data: UpdatePatientInput, updatedBy: string) {
    // Plugin handles PII encryption + search-hash refresh on findOneAndUpdate.
    const patient = await this.Patient.findByIdAndUpdate(
      id,
      { $set: { ...data, updatedBy } },
      { new: true, runValidators: true },
    ).lean();

    if (!patient) {
      throw ApiError.notFound('Patient');
    }

    // Dispatch webhook (non-blocking)
    this.fireWebhook('patient.updated', { patientId: id, ...patient });

    decryptPatientLean(patient);
    return patient;
  }

  // ── Transfer Patient to a different branch (Phase 9.1) ────

  async transferBranch(
    id: string,
    newBranchId: string,
    reason: string | undefined,
    transferredBy: string,
  ) {
    const patient = await this.Patient.findById(id);
    if (!patient) throw ApiError.notFound('Patient');

    const currentBranchId = patient.assignedBranchId?.toString();
    if (currentBranchId === newBranchId) {
      throw ApiError.badRequest('Patient is already assigned to this branch');
    }

    const now = new Date();

    // Close out the open history entry (if any)
    const history = patient.assignedBranchHistory ?? [];
    const open = history.find((h) => !h.to);
    if (open) {
      open.to = now;
    }

    // Append new entry
    history.push({
      branchId: newBranchId as unknown as IPatient['assignedBranchHistory'][number]['branchId'],
      from: now,
      to: null,
      reason,
      transferredBy:
        transferredBy as unknown as IPatient['assignedBranchHistory'][number]['transferredBy'],
    });

    patient.assignedBranchHistory = history;
    patient.assignedBranchId = newBranchId as unknown as IPatient['assignedBranchId'];
    patient.updatedBy = transferredBy as unknown as IPatient['updatedBy'];

    await patient.save();

    this.fireWebhook('patient.updated', {
      patientId: id,
      transfer: { from: currentBranchId ?? null, to: newBranchId, reason: reason ?? null },
    });

    // Re-fetch via lean so plugin decrypts before returning to the webhook payload.
    const fresh = await this.Patient.findById(id).lean<Record<string, unknown>>();
    decryptPatientLean(fresh);
    return fresh;
  }

  // ── Soft Delete Patient ───────────────────────────────────

  async softDelete(id: string, deletedBy: string) {
    const patient = await this.Patient.findByIdAndUpdate(
      id,
      { $set: { isActive: false, updatedBy: deletedBy } },
      { new: true },
    ).lean();

    if (!patient) {
      throw ApiError.notFound('Patient');
    }

    // Dispatch webhook (non-blocking)
    this.fireWebhook('patient.deleted', { patientId: id });

    return { message: 'Patient deactivated successfully' };
  }

  // ── Restore Patient ───────────────────────────────────────

  async restore(id: string, restoredBy: string) {
    const patient = await this.Patient.findByIdAndUpdate(
      id,
      { $set: { isActive: true, updatedBy: restoredBy } },
      { new: true },
    ).lean();

    if (!patient) {
      throw ApiError.notFound('Patient');
    }

    decryptPatientLean(patient);
    return patient;
  }

  // ── Update Medical History ────────────────────────────────

  async updateMedicalHistory(
    id: string,
    medicalHistory: Record<string, unknown>,
    updatedBy: string,
  ) {
    const update: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(medicalHistory)) {
      update[`medicalHistory.${key}`] = value;
    }
    update['medicalHistory.updatedBy'] = updatedBy;
    update['medicalHistory.updatedAt'] = new Date();

    const patient = await this.Patient.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true, runValidators: true },
    ).lean();

    if (!patient) {
      throw ApiError.notFound('Patient');
    }

    decryptPatientLean(patient);
    return patient;
  }

  // ── Add Allergy ───────────────────────────────────────────

  async addAllergy(
    id: string,
    allergy: { allergen: string; reaction?: string; severity?: string },
    addedBy: string,
  ) {
    const patient = await this.Patient.findByIdAndUpdate(
      id,
      {
        $push: {
          allergies: {
            ...allergy,
            severity: allergy.severity || 'mild',
            notedAt: new Date(),
          },
        },
        $set: { updatedBy: addedBy },
      },
      { new: true, runValidators: true },
    ).lean();

    if (!patient) {
      throw ApiError.notFound('Patient');
    }

    decryptPatientLean(patient);
    return patient;
  }

  // ── Remove Allergy ────────────────────────────────────────

  async removeAllergy(patientId: string, allergyId: string, removedBy: string) {
    const patient = await this.Patient.findByIdAndUpdate(
      patientId,
      { $pull: { allergies: { _id: allergyId } }, $set: { updatedBy: removedBy } },
      { new: true },
    ).lean();

    if (!patient) {
      throw ApiError.notFound('Patient');
    }

    decryptPatientLean(patient);
    return patient;
  }

  // ── PII Encryption Helpers ────────────────────────────────
  //
  // Encryption is now handled transparently by `fieldEncryptionPlugin` wired
  // into the Patient schema. The previous in-service helpers were removed in
  // C-1 because they double-encrypted any field also covered by the plugin and
  // used non-deterministic ciphertext for equality lookups (which silently
  // never matched). Equality lookups on encrypted fields use `searchHash()`
  // against the `*Hash` companion columns instead.

  /** Fire-and-forget webhook dispatch */
  private fireWebhook(event: TenantWebhookEvent, data: Record<string, unknown>): void {
    const tenantSlug = this.tenantDb.name?.replace('tenant_', '') || '';
    dispatchWebhook(this.tenantDb, {
      tenantId: tenantSlug,
      tenantSlug,
      event,
      data,
    }).catch((err) => {
      logger.warn(
        { event, error: err instanceof Error ? err.message : 'unknown' },
        'Webhook dispatch failed (non-fatal)',
      );
    });
  }
}
