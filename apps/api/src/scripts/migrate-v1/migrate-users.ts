/**
 * migrate-users.ts — Step 1: Users + Roles → users collection
 *
 * Maps v1 Supabase auth users (with profile data) → v2 User model.
 * Password hashes are preserved as-is (bcrypt). The compat shim in
 * auth.route.ts will re-hash to Argon2id on first login.
 */

import type { MigrationContext, MigrationStepResult } from './index.js';
import {
  startProgress,
  updateProgress,
  errorProgress,
  finishProgress,
  setIdMapping,
  toDate,
  migrationLog,
} from './utils.js';
import mongoose from 'mongoose';

export async function migrateUsers(ctx: MigrationContext): Promise<MigrationStepResult> {
  const start = Date.now();
  const { pgPool, dryRun } = ctx;

  // Fetch users from v1
  const tenantFilter = ctx.tenantSlug ? `WHERE t.slug = $1` : '';
  const params = ctx.tenantSlug ? [ctx.tenantSlug] : [];
  const { rows } = await pgPool.query(
    `SELECT u.id, u.email, u.encrypted_password, u.first_name, u.last_name,
            u.phone, u.role, u.tenant_id, u.is_active, u.two_factor_enabled,
            u.created_at, u.updated_at, t.slug as tenant_slug
     FROM users u
     LEFT JOIN tenants t ON u.tenant_id = t.id
     ${tenantFilter}
     ORDER BY u.created_at`,
    params,
  );

  const progress = startProgress('users', rows.length);

  const docs = [];
  for (const row of rows) {
    try {
      const _id = new mongoose.Types.ObjectId();
      setIdMapping('users', row.id, _id);

      docs.push({
        _id,
        email: row.email?.toLowerCase(),
        password: row.encrypted_password, // bcrypt hash — compat shim handles on first login
        firstName: row.first_name || '',
        lastName: row.last_name || '',
        phone: row.phone || null,
        role: mapRole(row.role),
        tenantSlug: row.tenant_slug || null,
        isActive: row.is_active ?? true,
        twoFactorEnabled: row.two_factor_enabled ?? false,
        passwordHashAlgorithm: 'bcrypt', // Flag for compat shim
        createdAt: toDate(row.created_at) ?? new Date(),
        updatedAt: toDate(row.updated_at) ?? new Date(),
      });

      updateProgress('users');
    } catch (error) {
      errorProgress('users');
      migrationLog.error(`Failed to transform user ${row.id}:`, error);
    }
  }

  if (!dryRun && docs.length > 0) {
    const db = mongoose.connection.db!;
    const collection = db.collection('users');
    try {
      await collection.insertMany(docs, { ordered: false });
    } catch {
      // Partial inserts with ordered: false
    }
  }

  finishProgress('users');

  return {
    step: 'users',
    total: rows.length,
    migrated: progress.processed,
    skipped: progress.skipped,
    errors: progress.errors,
    durationMs: Date.now() - start,
  };
}

function mapRole(v1Role: string): string {
  const roleMap: Record<string, string> = {
    admin: 'tenant_admin',
    doctor: 'doctor',
    receptionist: 'receptionist',
    nurse: 'nurse',
    accountant: 'accountant',
    lab_technician: 'lab_technician',
    hygienist: 'hygienist',
    superadmin: 'platform_admin',
  };
  return roleMap[v1Role?.toLowerCase()] || 'receptionist';
}
