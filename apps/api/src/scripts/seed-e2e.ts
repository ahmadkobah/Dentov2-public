/**
 * Dento v2 — E2E Test Seed Script
 *
 * Seeds both platform and tenant databases with the data
 * required for Playwright E2E tests to pass.
 *
 * Platform DB (dento_platform):
 *   - Platform admin user: admin@dento.dev / Admin@1234
 *   - Tenant admin user: doctor@clinic.com / Doctor@1234
 *   - Tenant record: slug=demo (active)
 *   - Tenant record: slug=e2e-test-clinic (for backup tests)
 *   - API key, Feature flag, Domain, Backup, SystemSettings
 *
 * Tenant DB (tenant_demo):
 *   - Branch, Doctor, Patient, Service + Category
 *   - InventoryCategory seeds, InventoryItem
 *   - Invoice, Appointment, CustomField
 *   - Medications + Lab Order Types (via seedTenantDatabase)
 *
 * Run: pnpm --filter @dento/api seed:e2e
 */

import mongoose from 'mongoose';
import argon2 from 'argon2';
import crypto from 'node:crypto';

// ── Platform Models ─────────────────────────────────────────
import { User } from '../platform/models/user.model.js';
import { Tenant } from '../platform/models/tenant.model.js';
import { ApiKey } from '../platform/models/api-key.model.js';
import { FeatureFlag } from '../platform/models/feature-flag.model.js';
import { Domain } from '../platform/models/domain.model.js';
import { Backup } from '../platform/models/backup.model.js';
import { SystemSettings } from '../platform/models/system-settings.model.js';

// ── Tenant Model Factories ──────────────────────────────────
import { getBranchModel } from '../tenant/models/branch.model.js';
import { getCustomFieldModel } from '../tenant/models/custom-field.model.js';
import {
  getInventoryCategoryModel,
  INVENTORY_CATEGORY_SEEDS,
} from '../tenant/models/inventory-category.model.js';
import { getAppointmentTypeModel } from '../tenant/models/appointment-type.model.js';
import { getInsuranceCompanyModel } from '../tenant/models/insurance-company.model.js';
import { getDoctorCommissionModel } from '../tenant/models/doctor-commission.model.js';
import { getWaitlistModel } from '../tenant/models/waitlist.model.js';
import { getPrescriptionModel } from '../tenant/models/prescription.model.js';
import { getTreatmentPlanModel } from '../tenant/models/treatment-plan.model.js';
import { getDentalLabModel } from '../tenant/models/dental-lab.model.js';

// ── Existing Tenant Seeder ──────────────────────────────────
import { seedTenantDatabase } from './seed-tenant.js';
import { syncAfterProvisioning } from '../platform/services/module-sync.service.js';

// ── Config ──────────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/dento_platform';

// ── Production Guard ───────────────────────────────────────────
if (process.env.NODE_ENV === 'production') {
  console.error('❌ Seed scripts must not run in production');
  process.exit(1);
}

const ARGON2_OPTIONS: argon2.Options = {
  type: argon2.argon2id,
  memoryCost: 65536,
  timeCost: 3,
  parallelism: 4,
};

// ── Helpers ─────────────────────────────────────────────────

async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

function upsertMsg(label: string, created: boolean) {
  return created ? `   ✓ Created: ${label}` : `   ⏭  Already exists: ${label}`;
}

// ── Main ────────────────────────────────────────────────────

async function seedE2E() {
  console.log('🧪 Starting E2E seed...\n');

  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // ════════════════════════════════════════════════════════
    //  PLATFORM DB (dento_platform)
    // ════════════════════════════════════════════════════════

    // ── 1. Platform Admin (developer portal login) ──────────
    console.log('👤 Platform Admin...');
    let platformAdmin = await User.findOne({ email: 'admin@dento.dev' });
    if (!platformAdmin) {
      platformAdmin = await User.create({
        email: 'admin@dento.dev',
        password: await hashPassword('Admin@1234'),
        passwordHistory: [await hashPassword('Admin@1234')],
        role: 'platform_admin',
        tenantSlug: null,
        platformRole: 'platform_owner',
        platformPermissionOverrides: [],
        profile: {
          firstName: { en: 'Ahmad', ar: 'أحمد' },
          lastName: { en: 'Admin', ar: 'أدمن' },
          displayName: 'Ahmad (Dev)',
          languagePreference: 'en',
        },
        status: 'active',
        isProfileComplete: true,
        isEmailVerified: true,
        tokenVersion: 0,
        activatedAt: new Date(),
      });
      console.log(upsertMsg('admin@dento.dev', true));
    } else {
      console.log(upsertMsg('admin@dento.dev', false));
    }

    // ── 2. Tenant record: demo ──────────────────────────────
    console.log('\n🏥 Tenant: demo...');
    let tenant = await Tenant.findOne({ slug: 'demo' });
    if (!tenant) {
      tenant = await Tenant.create({
        name: { en: 'Demo Clinic', ar: 'عيادة تجريبية' },
        slug: 'demo',
        status: 'active',
        activatedAt: new Date(),
        maxUsers: 50,
        maxBranches: 5,
        contact: {
          email: 'info@demo-clinic.com',
          phone: '+20 100 000 0000',
          address: { country: 'EG', city: 'Cairo' },
        },
        enabledModules: [
          'patients',
          'appointments',
          'reports',
          'invoices',
          'inventory',
          'prescriptions',
          'lab_orders',
          'treatment_plans',
          'dental_charts',
          'services_catalog',
          'commissions',
          'insurance',
          'payments',
          'installments',
          'doctors',
          'consent',
          'xrays',
          'users',
          'schedules',
          'branches',
          'notifications',
          'settings',
          'webhooks',
          'audit_logs',
          'procedure_notes',
        ],
        ownerId: platformAdmin._id,
        createdBy: platformAdmin._id,
      });
      console.log(upsertMsg('demo', true));
    } else {
      console.log(upsertMsg('demo', false));
    }

    // Sync TenantModule records so module tenant counts are accurate
    if (tenant.enabledModules?.length) {
      await syncAfterProvisioning(tenant._id.toString(), tenant.enabledModules as string[]);
      console.log(`   ✓ Synced ${tenant.enabledModules.length} TenantModule records`);
    }

    // ── 3. Tenant Admin (admin portal login) ────────────────
    console.log('\n👤 Tenant Admin...');
    let tenantAdmin = await User.findOne({ email: 'doctor@clinic.com' });
    if (!tenantAdmin) {
      tenantAdmin = await User.create({
        email: 'doctor@clinic.com',
        password: await hashPassword('Doctor@1234'),
        passwordHistory: [await hashPassword('Doctor@1234')],
        role: 'tenant_admin',
        tenantSlug: 'demo',
        profile: {
          firstName: { en: 'Demo', ar: 'تجريبي' },
          lastName: { en: 'Doctor', ar: 'طبيب' },
          displayName: 'Dr. Demo',
          phone: '+20 100 111 1111',
          languagePreference: 'en',
        },
        status: 'active',
        isProfileComplete: true,
        isEmailVerified: true,
        tokenVersion: 0,
        activatedAt: new Date(),
      });
      console.log(upsertMsg('doctor@clinic.com', true));
    } else {
      console.log(upsertMsg('doctor@clinic.com', false));
    }

    // ── 4. E2E test clinic tenant (for backup tests) ────────
    console.log('\n🏥 Tenant: e2e-test-clinic...');
    let e2eTenant = await Tenant.findOne({ slug: 'e2e-test-clinic' });
    if (!e2eTenant) {
      e2eTenant = await Tenant.create({
        name: { en: 'E2E Test Clinic' },
        slug: 'e2e-test-clinic',
        status: 'active',
        activatedAt: new Date(),
        contact: {
          email: 'e2e@test.com',
          phone: '+20 100 000 0001',
          address: { country: 'EG', city: 'Cairo' },
        },
        ownerId: platformAdmin._id,
        createdBy: platformAdmin._id,
      });
      console.log(upsertMsg('e2e-test-clinic', true));
    } else {
      console.log(upsertMsg('e2e-test-clinic', false));
    }

    // ── 4b. Second platform user (for suspend tests) ────────
    console.log('\n👤 Second Platform User...');
    let secondPlatformUser = await User.findOne({ email: 'team@dento.dev' });
    if (!secondPlatformUser) {
      secondPlatformUser = await User.create({
        email: 'team@dento.dev',
        password: await hashPassword('Team@1234'),
        passwordHistory: [await hashPassword('Team@1234')],
        role: 'platform_admin',
        tenantSlug: null,
        platformRole: 'platform_viewer',
        platformPermissionOverrides: [],
        profile: {
          firstName: { en: 'Team', ar: 'فريق' },
          lastName: { en: 'Member', ar: 'عضو' },
          displayName: 'Team Member',
          languagePreference: 'en',
        },
        status: 'active',
        isProfileComplete: true,
        isEmailVerified: true,
        tokenVersion: 0,
        activatedAt: new Date(),
      });
      console.log(upsertMsg('team@dento.dev', true));
    } else {
      console.log(upsertMsg('team@dento.dev', false));
    }

    // ── 4c. Suspended platform user (for reactivate tests) ──
    console.log('\n👤 Suspended Platform User...');
    let suspendedUser = await User.findOne({ email: 'suspended@dento.dev' });
    if (!suspendedUser) {
      suspendedUser = await User.create({
        email: 'suspended@dento.dev',
        password: await hashPassword('Suspended@1234'),
        passwordHistory: [await hashPassword('Suspended@1234')],
        role: 'platform_admin',
        tenantSlug: null,
        platformRole: 'platform_viewer',
        platformPermissionOverrides: [],
        profile: {
          firstName: { en: 'Suspended', ar: 'موقوف' },
          lastName: { en: 'User', ar: 'مستخدم' },
          displayName: 'Suspended User',
          languagePreference: 'en',
        },
        status: 'suspended',
        isProfileComplete: true,
        isEmailVerified: true,
        tokenVersion: 0,
        activatedAt: new Date(Date.now() - 30 * 86_400_000),
      });
      console.log(upsertMsg('suspended@dento.dev', true));
    } else {
      console.log(upsertMsg('suspended@dento.dev', false));
    }

    // ── 4d. Receptionist user (for RBAC tests) ──────────────
    console.log('\n👤 Receptionist User...');
    let receptionistUser = await User.findOne({ email: 'receptionist@clinic.com' });
    if (!receptionistUser) {
      receptionistUser = await User.create({
        email: 'receptionist@clinic.com',
        password: await hashPassword('Receptionist@1234'),
        passwordHistory: [await hashPassword('Receptionist@1234')],
        role: 'receptionist',
        tenantSlug: 'demo',
        profile: {
          firstName: { en: 'Sara', ar: 'سارة' },
          lastName: { en: 'Reception', ar: 'استقبال' },
          displayName: 'Sara (Receptionist)',
          phone: '+20 100 999 8888',
          languagePreference: 'en',
        },
        status: 'active',
        isProfileComplete: true,
        isEmailVerified: true,
        tokenVersion: 0,
        activatedAt: new Date(),
      });
      console.log(upsertMsg('receptionist@clinic.com', true));
    } else {
      console.log(upsertMsg('receptionist@clinic.com', false));
    }

    // ── 4e. Invited user (for invite flow tests) ─────────
    console.log('\n👤 Invited User...');
    const E2E_INVITE_TOKEN_RAW = 'e2e-valid-invite-token-0000000000000000';
    const E2E_INVITE_TOKEN_HASH = crypto
      .createHash('sha256')
      .update(E2E_INVITE_TOKEN_RAW)
      .digest('hex');
    let invitedUser = await User.findOne({ email: 'invited@dento.dev' });
    if (!invitedUser) {
      invitedUser = await User.create({
        email: 'invited@dento.dev',
        password: await hashPassword('Placeholder@0000'),
        inviteToken: E2E_INVITE_TOKEN_HASH,
        inviteTokenExpiresAt: new Date(Date.now() + 365 * 86_400_000),
        role: 'platform_admin',
        tenantSlug: null,
        platformRole: 'platform_viewer',
        platformPermissionOverrides: [],
        profile: {
          firstName: { en: 'Invited', ar: 'مدعو' },
          lastName: { en: 'User', ar: 'مستخدم' },
          displayName: 'Invited User',
          languagePreference: 'en',
        },
        status: 'invited',
        isProfileComplete: false,
        isEmailVerified: false,
        tokenVersion: 0,
      });
      console.log(upsertMsg('invited@dento.dev', true));
    } else {
      console.log(upsertMsg('invited@dento.dev', false));
    }

    // ── 5. API Key ──────────────────────────────────────────
    console.log('\n🔑 API Key...');
    const existingKey = await ApiKey.findOne({ name: 'E2E Test Key' });
    if (!existingKey) {
      const rawKey = `dento_test_${crypto.randomBytes(24).toString('hex')}`;
      const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
      await ApiKey.create({
        name: 'E2E Test Key',
        tenantId: tenant._id,
        scope: 'test',
        permissions: ['read', 'write'],
        keyPrefix: rawKey.slice(0, 12),
        keyHash,
        keySuffix: rawKey.slice(-4),
        isActive: true,
        createdBy: platformAdmin._id,
      });
      console.log(upsertMsg('E2E Test Key', true));
    } else {
      console.log(upsertMsg('E2E Test Key', false));
    }

    // ── 6. Feature Flag ─────────────────────────────────────
    console.log('\n🚩 Feature Flag...');
    const existingFlag = await FeatureFlag.findOne({ key: 'e2e_test_feature' });
    if (!existingFlag) {
      await FeatureFlag.create({
        key: 'e2e_test_feature',
        name: 'E2E Test Feature',
        description: 'Feature flag seeded for E2E tests',
        tenantId: null, // global flag
        enabled: true,
      });
      console.log(upsertMsg('e2e_test_feature', true));
    } else {
      console.log(upsertMsg('e2e_test_feature', false));
    }

    // ── 7. Domain ───────────────────────────────────────────
    console.log('\n🌐 Domain...');
    const existingDomain = await Domain.findOne({ customDomain: 'clinic.e2e-test.com' });
    if (!existingDomain) {
      await Domain.create({
        tenantSlug: 'demo',
        customDomain: 'clinic.e2e-test.com',
        dnsVerified: false,
        sslStatus: 'pending',
        requiredRecords: [
          { type: 'CNAME', name: 'clinic.e2e-test.com', value: 'proxy.dento.app', verified: false },
        ],
        isActive: false,
        createdBy: platformAdmin._id,
      });
      console.log(upsertMsg('clinic.e2e-test.com', true));
    } else {
      console.log(upsertMsg('clinic.e2e-test.com', false));
    }

    // ── 8. Backup ───────────────────────────────────────────
    console.log('\n💾 Backup...');
    const existingBackup = await Backup.findOne({ tenantSlug: 'demo' });
    if (!existingBackup) {
      await Backup.create({
        tenantSlug: 'demo',
        type: 'manual',
        status: 'completed',
        filePath: '/backups/tenant_demo_seed.gz',
        fileSize: 1024,
        checksum: crypto.randomBytes(32).toString('hex'),
        startedAt: new Date(Date.now() - 60_000),
        completedAt: new Date(),
        retentionDays: 365,
        expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        initiatedBy: platformAdmin._id,
        createdBy: platformAdmin._id,
      });
      console.log(upsertMsg('demo manual backup', true));
    } else {
      console.log(upsertMsg('demo manual backup', false));
    }

    // ── 9. System Settings ──────────────────────────────────
    console.log('\n⚙️  System Settings...');
    const existingSettings = await SystemSettings.findById('default');
    if (!existingSettings) {
      await SystemSettings.create({ _id: 'default' });
      console.log(upsertMsg('system_settings singleton', true));
    } else {
      console.log(upsertMsg('system_settings singleton', false));
    }

    // ════════════════════════════════════════════════════════
    //  TENANT DB (tenant_demo)
    // ════════════════════════════════════════════════════════

    console.log('\n─'.repeat(50));
    console.log('🦷 Seeding tenant_demo...\n');

    const tenantDb = mongoose.connection.useDb('tenant_demo', { useCache: true });
    const adminId = tenantAdmin._id;

    // ── 10. Branch ──────────────────────────────────────────
    console.log('🏢 Branch...');
    const Branch = getBranchModel(tenantDb);
    let branch = await Branch.findOne({ code: 'MAIN' });
    if (!branch) {
      branch = await Branch.create({
        name: { en: 'Main Branch', ar: 'الفرع الرئيسي' },
        code: 'MAIN',
        address: { en: '123 Cairo St', ar: 'شارع القاهرة 123' },
        city: 'Cairo',
        phone: '+20 2 1234 5678',
        email: 'main@demo-clinic.com',
        chairs: [
          { number: 1, name: 'Chair 1', isActive: true, equipmentType: 'standard' },
          { number: 2, name: 'Chair 2', isActive: true, equipmentType: 'surgical' },
        ],
        workingHours: [
          { dayOfWeek: 0, openTime: '09:00', closeTime: '17:00', isClosed: false },
          { dayOfWeek: 1, openTime: '09:00', closeTime: '17:00', isClosed: false },
          { dayOfWeek: 2, openTime: '09:00', closeTime: '17:00', isClosed: false },
          { dayOfWeek: 3, openTime: '09:00', closeTime: '17:00', isClosed: false },
          { dayOfWeek: 4, openTime: '09:00', closeTime: '17:00', isClosed: false },
          { dayOfWeek: 5, openTime: '09:00', closeTime: '14:00', isClosed: false },
          { dayOfWeek: 6, openTime: '00:00', closeTime: '00:00', isClosed: true },
        ],
        isPrimary: true,
        createdBy: adminId,
      });
      console.log(upsertMsg('MAIN branch', true));
    } else {
      console.log(upsertMsg('MAIN branch', false));
    }

    // ── 11. Service Category ────────────────────────────────
    console.log('\n📂 Service Category...');
    // service-category.model was removed in a refactor; use an inline schema
    // (same pattern as Service/Doctor/Patient below) to keep this seed runnable.
    const serviceCategorySchema = new mongoose.Schema(
      {
        name: {
          en: { type: String, required: true },
          ar: { type: String, default: '' },
        },
        description: {
          en: { type: String, default: '' },
          ar: { type: String, default: '' },
        },
        sortOrder: { type: Number, default: 0 },
      },
      { timestamps: true },
    );
    const ServiceCategory =
      (tenantDb.models.ServiceCategory as mongoose.Model<any>) ||
      tenantDb.model('ServiceCategory', serviceCategorySchema);
    let svcCategory = await ServiceCategory.findOne({ 'name.en': 'General Dentistry' });
    if (!svcCategory) {
      svcCategory = await ServiceCategory.create({
        name: { en: 'General Dentistry', ar: 'طب أسنان عام' },
        description: { en: 'Basic dental services', ar: 'خدمات أسنان أساسية' },
        sortOrder: 1,
      });
      console.log(upsertMsg('General Dentistry', true));
    } else {
      console.log(upsertMsg('General Dentistry', false));
    }

    // ── 12. Service (using inline schema like seed-tenant) ──
    console.log('\n🩺 Service...');
    const serviceSchema = new mongoose.Schema(
      {
        name: {
          en: { type: String, required: true },
          ar: { type: String, default: '' },
        },
        defaultPrice: { type: Number, required: true },
        categoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'ServiceCategory' },
        isActive: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId },
      },
      { timestamps: true },
    );
    const Service =
      (tenantDb.models.Service as mongoose.Model<any>) || tenantDb.model('Service', serviceSchema);
    let service = await Service.findOne({ 'name.en': 'Dental Cleaning' });
    if (!service) {
      service = await Service.create({
        name: { en: 'Dental Cleaning', ar: 'تنظيف أسنان' },
        defaultPrice: 200,
        categoryId: svcCategory._id,
        createdBy: adminId,
      });
      console.log(upsertMsg('Dental Cleaning', true));
    } else {
      console.log(upsertMsg('Dental Cleaning', false));
    }

    // ── 13. Doctor (inline schema) ──────────────────────────
    console.log('\n🩻 Doctor...');
    const doctorSchema = new mongoose.Schema(
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
        firstName: { en: { type: String, required: true }, ar: { type: String, default: '' } },
        lastName: { en: { type: String, required: true }, ar: { type: String, default: '' } },
        email: { type: String, required: true },
        specialization: { type: String, required: true },
        branchIds: [{ type: mongoose.Schema.Types.ObjectId }],
        isActive: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId },
      },
      { timestamps: true },
    );
    const Doctor =
      (tenantDb.models.Doctor as mongoose.Model<any>) || tenantDb.model('Doctor', doctorSchema);
    let doctor = await Doctor.findOne({ email: 'doctor@clinic.com' });
    if (!doctor) {
      doctor = await Doctor.create({
        userId: adminId,
        firstName: { en: 'Demo', ar: 'تجريبي' },
        lastName: { en: 'Doctor', ar: 'طبيب' },
        email: 'doctor@clinic.com',
        specialization: 'General Dentistry',
        branchIds: [branch._id],
        createdBy: adminId,
      });
      console.log(upsertMsg('Demo Doctor', true));
    } else {
      console.log(upsertMsg('Demo Doctor', false));
    }

    // ── 14. Patient (inline schema — patientCode auto-generates) ─
    console.log('\n🧑‍🦱 Patient...');
    const patientSchema = new mongoose.Schema(
      {
        patientCode: { type: String, unique: true },
        firstName: { en: { type: String, required: true }, ar: { type: String, default: '' } },
        lastName: { en: { type: String, required: true }, ar: { type: String, default: '' } },
        dateOfBirth: { type: Date, required: true },
        gender: { type: String, enum: ['male', 'female', 'other'], required: true },
        phone: { type: String, required: true },
        email: { type: String },
        isActive: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
      },
      { timestamps: true },
    );
    // Auto-generate patientCode
    patientSchema.pre('validate', async function () {
      if (this.isNew && !this.patientCode) {
        const count = await (this.constructor as any).countDocuments();
        this.patientCode = `DEN-${String(count + 1).padStart(6, '0')}`;
      }
    });
    const Patient =
      (tenantDb.models.Patient as mongoose.Model<any>) || tenantDb.model('Patient', patientSchema);
    let patient = await Patient.findOne({ 'firstName.en': 'Seed' });
    if (!patient) {
      patient = await Patient.create({
        firstName: { en: 'Seed', ar: 'بذرة' },
        lastName: { en: 'Patient', ar: 'مريض' },
        dateOfBirth: new Date('1990-01-15'),
        gender: 'male',
        phone: '+20 100 222 3333',
        email: 'seed.patient@test.com',
        createdBy: adminId,
      });
      console.log(upsertMsg('Seed Patient', true));
    } else {
      console.log(upsertMsg('Seed Patient', false));
    }

    // Bulk-seed extra patients so pagination controls appear (need >20 for page size 20)
    const patientCount = await Patient.countDocuments();
    if (patientCount < 25) {
      const extras = 25 - patientCount;
      const firstNames = [
        'Ahmed',
        'Sara',
        'Omar',
        'Nour',
        'Khalid',
        'Layla',
        'Youssef',
        'Hana',
        'Ali',
        'Dina',
        'Tarek',
        'Mona',
        'Ziad',
        'Rania',
        'Fadi',
        'Reem',
        'Hassan',
        'Lina',
        'Bilal',
        'Jenna',
        'Sami',
        'Rana',
        'Nabil',
        'Dalia',
      ];
      for (let i = 0; i < extras; i++) {
        const idx = i % firstNames.length;
        await Patient.create({
          firstName: { en: firstNames[idx], ar: firstNames[idx] },
          lastName: { en: `Test-${i + 2}`, ar: `اختبار-${i + 2}` },
          dateOfBirth: new Date(`199${(i % 9) + 1}-0${(i % 9) + 1}-15`),
          gender: i % 2 === 0 ? 'male' : 'female',
          phone: `+20 100 000 ${String(i + 10).padStart(4, '0')}`,
          email: `patient${i + 2}@test.com`,
          createdBy: adminId,
        });
      }
      console.log(`   ✓ ${extras} extra patients seeded for pagination`);
    }

    // ── 15. Inventory Categories ─────────────────────────────
    console.log('\n📦 Inventory Categories...');
    const InventoryCategory = getInventoryCategoryModel(tenantDb);
    let seededCategoryCount = 0;
    for (const cat of INVENTORY_CATEGORY_SEEDS) {
      const exists = await InventoryCategory.findOne({ slug: cat.slug });
      if (!exists) {
        await InventoryCategory.create({ ...cat, createdBy: adminId });
        seededCategoryCount++;
      }
    }
    console.log(
      `   ✓ ${seededCategoryCount} new categories seeded (${INVENTORY_CATEGORY_SEEDS.length} total)`,
    );

    // ── 16. Inventory Item (inline schema — sku auto-gen) ───
    console.log('\n📦 Inventory Item...');
    const firstCategory = await InventoryCategory.findOne({ slug: 'consumables' });
    const inventoryItemSchema = new mongoose.Schema(
      {
        sku: { type: String, unique: true },
        nameEn: { type: String, required: true },
        nameAr: { type: String, default: '' },
        categoryId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'InventoryCategory',
          required: true,
        },
        currentStock: { type: Number, default: 0 },
        reorderLevel: { type: Number, default: 10 },
        unitCost: { type: Number, default: 0 },
        sellingPrice: { type: Number, default: 0 },
        isActive: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId },
      },
      { timestamps: true },
    );
    inventoryItemSchema.pre('validate', async function () {
      if (this.isNew && !this.sku) {
        const year = new Date().getFullYear();
        const count = await (this.constructor as any).countDocuments();
        this.sku = `ITM-${year}-${String(count + 1).padStart(5, '0')}`;
      }
    });
    const InventoryItem =
      (tenantDb.models.InventoryItem as mongoose.Model<any>) ||
      tenantDb.model('InventoryItem', inventoryItemSchema);
    let invItem = await InventoryItem.findOne({ nameEn: 'Dental Gloves (Box)' });
    if (!invItem) {
      invItem = await InventoryItem.create({
        nameEn: 'Dental Gloves (Box)',
        nameAr: 'قفازات طبية (علبة)',
        categoryId: firstCategory!._id,
        currentStock: 50,
        reorderLevel: 10,
        unitCost: 25,
        sellingPrice: 40,
        createdBy: adminId,
      });
      console.log(upsertMsg('Dental Gloves (Box)', true));
    } else {
      console.log(upsertMsg('Dental Gloves (Box)', false));
    }

    // ── 17. Invoice (inline schema — invoiceNumber auto-gen) ─
    console.log('\n🧾 Invoice...');
    const invoiceSchema = new mongoose.Schema(
      {
        invoiceNumber: { type: String, unique: true },
        patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
        branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
        items: [
          {
            serviceId: mongoose.Schema.Types.ObjectId,
            description: String,
            quantity: { type: Number, default: 1 },
            unitPrice: Number,
            total: Number,
          },
        ],
        subtotal: { type: Number, required: true },
        discount: { type: Number, default: 0 },
        tax: { type: Number, default: 0 },
        totalAmount: { type: Number, required: true },
        status: {
          type: String,
          enum: ['draft', 'pending', 'paid', 'partially_paid', 'cancelled', 'refunded'],
          default: 'pending',
        },
        isActive: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId, required: true },
      },
      { timestamps: true },
    );
    invoiceSchema.pre('validate', async function () {
      if (this.isNew && !this.invoiceNumber) {
        const year = new Date().getFullYear();
        const count = await (this.constructor as any).countDocuments();
        this.invoiceNumber = `INV-${year}-${String(count + 1).padStart(5, '0')}`;
      }
    });
    const Invoice =
      (tenantDb.models.Invoice as mongoose.Model<any>) || tenantDb.model('Invoice', invoiceSchema);
    let invoice = await Invoice.findOne({ patientId: patient._id });
    if (!invoice) {
      invoice = await Invoice.create({
        patientId: patient._id,
        branchId: branch._id,
        items: [
          {
            serviceId: service._id,
            description: 'Dental Cleaning',
            quantity: 1,
            unitPrice: 200,
            total: 200,
          },
        ],
        subtotal: 200,
        totalAmount: 200,
        createdBy: adminId,
      });
      console.log(upsertMsg(`Invoice ${invoice.invoiceNumber}`, true));
    } else {
      console.log(upsertMsg(`Invoice ${invoice.invoiceNumber}`, false));
    }

    // ── 18. Appointment (inline schema) ─────────────────────
    console.log('\n📅 Appointment...');
    const appointmentSchema = new mongoose.Schema(
      {
        patientId: { type: mongoose.Schema.Types.ObjectId, ref: 'Patient', required: true },
        doctorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Doctor', required: true },
        branchId: { type: mongoose.Schema.Types.ObjectId, ref: 'Branch', required: true },
        date: { type: Date, required: true },
        startTime: { type: String, required: true },
        endTime: { type: String, required: true },
        status: {
          type: String,
          enum: [
            'booked',
            'confirmed',
            'checked_in',
            'in_progress',
            'completed',
            'cancelled',
            'no_show',
          ],
          default: 'booked',
        },
        isActive: { type: Boolean, default: true },
        createdBy: { type: mongoose.Schema.Types.ObjectId },
      },
      { timestamps: true },
    );
    const Appointment =
      (tenantDb.models.Appointment as mongoose.Model<any>) ||
      tenantDb.model('Appointment', appointmentSchema);
    let appt = await Appointment.findOne({ patientId: patient._id, status: 'booked' });
    // Always ensure a booked appointment exists for today (for E2E calendar tests)
    const today = new Date();
    today.setHours(14, 0, 0, 0);
    const todayStr = today.toISOString().split('T')[0];
    if (!appt || appt.date.toISOString().split('T')[0] !== todayStr) {
      if (appt) await Appointment.deleteOne({ _id: appt._id });
      appt = await Appointment.create({
        patientId: patient._id,
        doctorId: doctor._id,
        branchId: branch._id,
        date: today,
        startTime: '14:00',
        endTime: '14:30',
        status: 'booked',
        createdBy: adminId,
      });
      console.log(upsertMsg('Appointment (today 14:00)', true));
    } else {
      console.log(upsertMsg('Appointment', false));
    }

    // ── 19. Custom Field ────────────────────────────────────
    console.log('\n🏷️  Custom Field...');
    const CustomField = getCustomFieldModel(tenantDb);
    let cf = await CustomField.findOne({ fieldKey: 'e2e_referral_source' });
    if (!cf) {
      cf = await CustomField.create({
        entity: 'patient',
        fieldKey: 'e2e_referral_source',
        label: { en: 'Referral Source', ar: 'مصدر الإحالة' },
        type: 'text',
        isRequired: false,
        showInList: true,
        showInForm: true,
        createdBy: adminId,
      });
      console.log(upsertMsg('e2e_referral_source', true));
    } else {
      console.log(upsertMsg('e2e_referral_source', false));
    }

    // ── 20. Appointment Type ────────────────────────────────
    console.log('\n📋 Appointment Type...');
    const AppointmentType = getAppointmentTypeModel(tenantDb);
    let apptType = await AppointmentType.findOne({ code: 'regular-checkup' });
    if (!apptType) {
      apptType = await AppointmentType.create({
        name: { en: 'Regular Checkup', ar: 'فحص دوري' },
        code: 'regular-checkup',
        defaultDuration: 30,
        color: '#4CAF50',
        isDoctorRequired: true,
        isOnlineBookingAllowed: false,
        defaultFee: 150,
        sortOrder: 1,
        createdBy: adminId,
      });
      console.log(upsertMsg('Regular Checkup', true));
    } else {
      console.log(upsertMsg('Regular Checkup', false));
    }

    // ── 21. Insurance Company ───────────────────────────────
    console.log('\n🏢 Insurance Company...');
    const InsuranceCompany = getInsuranceCompanyModel(tenantDb);
    let insCompany = await InsuranceCompany.findOne({ code: 'e2e-ins-001' });
    if (!insCompany) {
      insCompany = await InsuranceCompany.create({
        name: { en: 'MetLife Dental', ar: 'ميتلايف للأسنان' },
        code: 'e2e-ins-001',
        contactPerson: 'Test Contact',
        phone: '+20 100 333 4444',
        email: 'insurance@test.com',
        coveragePercentage: 80,
        maxCoverage: 10000,
        createdBy: adminId,
      });
      console.log(upsertMsg('MetLife Dental', true));
    } else {
      console.log(upsertMsg('MetLife Dental', false));
    }

    // ── 22. Dental Lab ──────────────────────────────────────
    console.log('\n🔬 Dental Lab...');
    const DentalLab = getDentalLabModel(tenantDb);
    let dentalLab = await DentalLab.findOne({ name: 'E2E Test Lab' });
    if (!dentalLab) {
      dentalLab = await DentalLab.create({
        name: 'E2E Test Lab',
        contactPerson: 'Lab Manager',
        phone: '+20 100 555 6666',
        email: 'lab@test.com',
        city: 'Cairo',
        specialties: ['crowns', 'bridges', 'veneers'],
        rating: 4,
        defaultTurnaroundDays: 5,
      });
      console.log(upsertMsg('E2E Test Lab', true));
    } else {
      console.log(upsertMsg('E2E Test Lab', false));
    }

    // ── 23. Supplier ────────────────────────────────────────
    console.log('\n🏭 Supplier...');
    // supplier.model was removed in a refactor; inline schema keeps this seed runnable.
    const supplierSchema = new mongoose.Schema(
      {
        name: { type: String, required: true },
        contactPerson: { type: String, default: '' },
        phone: { type: String, default: '' },
        email: { type: String, default: '' },
        city: { type: String, default: '' },
        createdBy: { type: mongoose.Schema.Types.ObjectId },
      },
      { timestamps: true },
    );
    const Supplier =
      (tenantDb.models.Supplier as mongoose.Model<any>) ||
      tenantDb.model('Supplier', supplierSchema);
    let supplier = await Supplier.findOne({ name: 'E2E Test Supplier' });
    if (!supplier) {
      supplier = await Supplier.create({
        name: 'E2E Test Supplier',
        contactPerson: 'Supplier Contact',
        phone: '+20 100 777 8888',
        email: 'supplier@test.com',
        city: 'Cairo',
        createdBy: adminId,
      });
      console.log(upsertMsg('E2E Test Supplier', true));
    } else {
      console.log(upsertMsg('E2E Test Supplier', false));
    }

    // ── 24. Treatment Plan ──────────────────────────────────
    console.log('\n📝 Treatment Plan...');
    const TreatmentPlan = getTreatmentPlanModel(tenantDb);
    let treatmentPlan = await TreatmentPlan.findOne({ title: 'E2E Treatment Plan' });
    if (!treatmentPlan) {
      treatmentPlan = await TreatmentPlan.create({
        patientId: patient._id,
        doctorId: doctor._id,
        title: 'E2E Treatment Plan',
        description: 'Treatment plan seeded for E2E testing',
        status: 'proposed',
        items: [
          {
            serviceId: service._id,
            procedureName: 'Dental Cleaning',
            cost: 200,
            sequenceOrder: 1,
            status: 'pending',
          },
        ],
        createdBy: adminId,
      });
      console.log(upsertMsg('E2E Treatment Plan', true));
    } else {
      console.log(upsertMsg('E2E Treatment Plan', false));
    }

    // ── 25. Prescription ────────────────────────────────────
    console.log('\n💊 Prescription...');
    const Prescription = getPrescriptionModel(tenantDb);
    let prescription = await Prescription.findOne({ diagnosis: 'E2E dental infection' });
    if (!prescription) {
      prescription = await Prescription.create({
        patientId: patient._id,
        doctorId: doctor._id,
        appointmentId: appt._id,
        items: [
          {
            medicationName: 'Amoxicillin 500mg',
            dosage: '500mg',
            frequency: '3 times daily',
            duration: '7 days',
            quantity: 21,
            instructions: 'Take after meals',
          },
        ],
        diagnosis: 'E2E dental infection',
        status: 'active',
        validUntil: new Date(Date.now() + 30 * 86_400_000),
        createdBy: adminId,
      });
      console.log(upsertMsg(`Prescription ${prescription.prescriptionNumber}`, true));
    } else {
      console.log(upsertMsg(`Prescription ${prescription.prescriptionNumber}`, false));
    }

    // ── 26. Waitlist Entry ──────────────────────────────────
    console.log('\n⏳ Waitlist Entry...');
    const Waitlist = getWaitlistModel(tenantDb);
    let waitlistEntry = await Waitlist.findOne({ patientId: patient._id });
    if (!waitlistEntry) {
      waitlistEntry = await Waitlist.create({
        patientId: patient._id,
        doctorId: doctor._id,
        branchId: branch._id,
        preferredFrom: new Date(),
        preferredTo: new Date(Date.now() + 14 * 86_400_000),
        durationMinutes: 30,
        priority: 'normal',
        status: 'active',
        notes: 'E2E test waitlist entry',
        createdBy: adminId,
      });
      console.log(upsertMsg('Waitlist entry', true));
    } else {
      console.log(upsertMsg('Waitlist entry', false));
    }

    // ── 27. Doctor Commission ───────────────────────────────
    console.log('\n💰 Doctor Commission...');
    const DoctorCommission = getDoctorCommissionModel(tenantDb);
    let commission = await DoctorCommission.findOne({ doctorId: doctor._id, status: 'pending' });
    if (!commission) {
      commission = await DoctorCommission.create({
        doctorId: doctor._id,
        appointmentId: appt._id,
        invoiceId: invoice._id,
        procedureName: 'Dental Cleaning',
        procedureAmount: 200,
        commissionRate: 0.1,
        commissionAmount: 20,
        status: 'pending',
        createdBy: adminId,
      });
      console.log(upsertMsg('Doctor commission (pending)', true));
    } else {
      console.log(upsertMsg('Doctor commission (pending)', false));
    }
    // Ensure an approved commission exists for payout testing
    const approvedCommission = await DoctorCommission.findOne({
      doctorId: doctor._id,
      status: 'approved',
    });
    if (!approvedCommission) {
      await DoctorCommission.create({
        doctorId: doctor._id,
        appointmentId: appt._id,
        invoiceId: invoice._id,
        procedureName: 'Root Canal',
        procedureAmount: 800,
        commissionRate: 0.1,
        commissionAmount: 80,
        status: 'approved',
        createdBy: adminId,
      });
      console.log(upsertMsg('Doctor commission (approved)', true));
    } else {
      console.log(upsertMsg('Doctor commission (approved)', false));
    }

    // ── 28. Payment ───────────────────────────────────────────
    console.log('\n💳 Tenant Payment...');
    const { getTenantPaymentModel } = await import('../tenant/models/payment.model.js');
    const TenantPayment = getTenantPaymentModel(tenantDb);
    let payment = await TenantPayment.findOne({ invoiceId: invoice._id });
    if (!payment) {
      payment = await TenantPayment.create({
        invoiceId: invoice._id,
        patientId: patient._id,
        amount: 200,
        paymentMethod: 'cash',
        status: 'completed',
        receivedBy: adminId,
        receivedAt: new Date(),
        createdBy: adminId,
      });
      console.log(upsertMsg('Tenant payment (completed)', true));
    } else {
      console.log(upsertMsg('Tenant payment', false));
    }

    // ── 29. Medications + Lab Order Types ───────────────────
    console.log('\n💊 Medications & Lab Order Types...');
    await seedTenantDatabase(tenantDb, 'demo');

    // ════════════════════════════════════════════════════════
    //  SUMMARY
    // ════════════════════════════════════════════════════════

    console.log('\n' + '═'.repeat(50));
    console.log('✅ E2E seed complete!');
    console.log('═'.repeat(50));
    console.log(`\n📊 Summary:`);
    console.log(`   Platform DB (dento_platform):`);
    console.log(`     • Platform admin:  admin@dento.dev / Admin@1234`);
    console.log(`     • Tenant admin:    doctor@clinic.com / Doctor@1234`);
    console.log(`     • Team member:     team@dento.dev / Team@1234`);
    console.log(`     • Suspended user:  suspended@dento.dev / Suspended@1234`);
    console.log(`     • Receptionist:    receptionist@clinic.com / Receptionist@1234`);
    console.log(`     • Invited user:    invited@dento.dev (token: e2e-valid-invite-...)`);
    console.log(`     • Tenants:         demo, e2e-test-clinic`);
    console.log(`     • API Key, Feature Flag, Domain, Backup, SystemSettings`);
    console.log(`\n   Tenant DB (tenant_demo):`);
    console.log(`     • Branch, Doctor, Patient, Service, Invoice, Appointment`);
    console.log(`     • ${INVENTORY_CATEGORY_SEEDS.length} inventory categories + 1 item`);
    console.log(`     • AppointmentType, InsuranceCompany, DentalLab, Supplier`);
    console.log(`     • TreatmentPlan, Prescription, WaitlistEntry, Commission`);
    console.log(`     • Custom field, Medications, Lab order types`);
    console.log('═'.repeat(50));
  } catch (error) {
    console.error('❌ E2E seed failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

// Run
seedE2E();
