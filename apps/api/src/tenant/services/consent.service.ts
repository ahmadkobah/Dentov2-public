/**
 * Consent Service — Templates CRUD + Forms CRUD
 *
 * Per V2_DATABASE.md §5.11 — consent_templates, consent_forms
 * Per DENTO_V2_MASTER_PLAN.md §10 (#24) — Consent Forms
 */

import type { Connection, QueryFilter } from 'mongoose';
import type { IConsentTemplate } from '../models/consent-template.model.js';
import type { IConsentForm } from '../models/consent-form.model.js';
import { getConsentTemplateModel } from '../models/consent-template.model.js';
import { getConsentFormModel } from '../models/consent-form.model.js';
import { getPatientModel } from '../models/patient.model.js';
import { regexContains } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';
import type {
  CreateConsentTemplateInput,
  UpdateConsentTemplateInput,
  ConsentTemplateQuery,
  CreateConsentFormInput,
  ConsentFormQuery,
} from '@dento/shared';

// ── Consent Template Service ────────────────────────────────

export class ConsentTemplateService {
  private Template;

  constructor(tenantDb: Connection) {
    this.Template = getConsentTemplateModel(tenantDb);
  }

  async list(query: ConsentTemplateQuery) {
    const { page, limit, search, procedureType, isActive, sortBy, sortOrder } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IConsentTemplate> = {};
    if (isActive !== undefined) filter.isActive = isActive;
    if (procedureType) filter.procedureType = procedureType;
    if (search) {
      filter.$or = [
        { 'name.en': regexContains(search) },
        { 'name.ar': regexContains(search) },
        { procedureType: regexContains(search) },
      ];
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [templates, total] = await Promise.all([
      this.Template.find(filter).sort(sort).skip(skip).limit(limit).lean(),
      this.Template.countDocuments(filter),
    ]);

    return {
      templates,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const template = await this.Template.findById(id).lean();
    if (!template) throw ApiError.notFound('Consent Template');
    return template;
  }

  async create(data: CreateConsentTemplateInput) {
    const template = await this.Template.create(data);
    return template.toJSON();
  }

  async update(id: string, data: UpdateConsentTemplateInput) {
    const template = await this.Template.findByIdAndUpdate(
      id,
      { $set: data },
      { new: true, runValidators: true },
    ).lean();
    if (!template) throw ApiError.notFound('Consent Template');
    return template;
  }

  async delete(id: string) {
    const template = await this.Template.findByIdAndUpdate(
      id,
      { $set: { isActive: false } },
      { new: true },
    ).lean();
    if (!template) throw ApiError.notFound('Consent Template');
    return template;
  }
}

// ── Consent Form Service ────────────────────────────────────

export class ConsentFormService {
  private Form;
  private Template;
  private Patient;

  constructor(tenantDb: Connection) {
    this.Form = getConsentFormModel(tenantDb);
    this.Template = getConsentTemplateModel(tenantDb);
    this.Patient = getPatientModel(tenantDb);
  }

  async list(query: ConsentFormQuery) {
    const {
      page,
      limit,
      patientId,
      doctorId,
      treatmentPlanId,
      templateId,
      search,
      sortBy,
      sortOrder,
    } = query;
    const skip = (page - 1) * limit;

    const filter: QueryFilter<IConsentForm> = {};
    if (patientId) filter.patientId = patientId;
    if (doctorId) filter.doctorId = doctorId;
    if (treatmentPlanId) filter.treatmentPlanId = treatmentPlanId;
    if (templateId) filter.templateId = templateId;

    // Signed forms reference the patient by ObjectId, so to search by patient name we
    // pre-resolve matching patient IDs and filter on them. (No explicit patientId is
    // sent alongside search from the UI.)
    if (search && !patientId) {
      const matchedPatients = await this.Patient.find({
        $or: [
          { 'firstName.en': regexContains(search) },
          { 'firstName.ar': regexContains(search) },
          { 'lastName.en': regexContains(search) },
          { 'lastName.ar': regexContains(search) },
        ],
      })
        .select('_id')
        .lean();
      filter.patientId = { $in: matchedPatients.map((p) => p._id) };
    }

    const sort: Record<string, 1 | -1> = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    const [rawForms, total] = await Promise.all([
      this.Form.find(filter)
        .populate('templateId', 'name procedureType')
        .populate('patientId', 'firstName lastName patientCode phone')
        .populate('doctorId', 'firstName lastName')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        // populate() replaces the ObjectId fields with documents; type the lean result as a
        // generic record so the reshaping below can read either ObjectIds or populated objects.
        .lean<Record<string, unknown>[]>(),
      this.Form.countDocuments(filter),
    ]);

    // Remap populated ObjectId fields so the frontend gets both IDs and populated objects
    const forms = rawForms.map((f: Record<string, unknown>) => {
      const { templateId: tpl, patientId: pat, doctorId: doc, ...rest } = f;
      return {
        ...rest,
        templateId:
          typeof tpl === 'object' && tpl !== null ? (tpl as Record<string, unknown>)._id : tpl,
        patientId:
          typeof pat === 'object' && pat !== null ? (pat as Record<string, unknown>)._id : pat,
        doctorId:
          typeof doc === 'object' && doc !== null ? (doc as Record<string, unknown>)._id : doc,
        template: typeof tpl === 'object' ? tpl : undefined,
        patient: typeof pat === 'object' ? pat : undefined,
        doctor: typeof doc === 'object' ? doc : undefined,
      };
    });

    return {
      forms,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const form = await this.Form.findById(id).lean();
    if (!form) throw ApiError.notFound('Consent Form');
    return form;
  }

  async create(data: CreateConsentFormInput) {
    // Validate template exists
    const template = await this.Template.findById(data.templateId).lean();
    if (!template) throw ApiError.notFound('Consent Template');
    if (!template.isActive) throw ApiError.badRequest('Consent Template is not active');

    const form = await this.Form.create(data);
    return form.toJSON();
  }

  async getByPatient(patientId: string) {
    return this.Form.find({ patientId }).sort({ createdAt: -1 }).lean();
  }

  async getByTreatmentPlan(treatmentPlanId: string) {
    return this.Form.find({ treatmentPlanId }).sort({ createdAt: -1 }).lean();
  }

  async updatePdfUrl(id: string, pdfUrl: string) {
    const form = await this.Form.findByIdAndUpdate(
      id,
      { $set: { pdfUrl } },
      { new: true, runValidators: true },
    ).lean();
    if (!form) throw ApiError.notFound('Consent Form');
    return form;
  }
}
