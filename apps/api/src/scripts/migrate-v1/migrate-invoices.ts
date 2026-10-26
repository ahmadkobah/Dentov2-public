/**
 * migrate-invoices.ts — Step 6: Invoices + items + payments → invoices + payments
 */

import type { MigrationContext, MigrationStepResult } from './index.js';
import {
  startProgress,
  updateProgress,
  errorProgress,
  finishProgress,
  setIdMapping,
  getIdMapping,
  toDate,
  migrationLog,
} from './utils.js';
import mongoose from 'mongoose';

export async function migrateInvoices(ctx: MigrationContext): Promise<MigrationStepResult> {
  const start = Date.now();
  const { pgPool, dryRun } = ctx;

  const tenantFilter = ctx.tenantSlug ? `WHERE t.slug = $1` : '';
  const params = ctx.tenantSlug ? [ctx.tenantSlug] : [];

  // Invoices
  const { rows: invoices } = await pgPool.query(
    `SELECT i.*, t.slug as tenant_slug
     FROM invoices i
     LEFT JOIN tenants t ON i.tenant_id = t.id
     ${tenantFilter}
     ORDER BY i.created_at`,
    params,
  );

  // Invoice items
  const { rows: items } = await pgPool.query(`SELECT * FROM invoice_items ORDER BY invoice_id`);
  const itemMap: Record<string, Record<string, unknown>[]> = {};
  for (const item of items) {
    const key = String(item.invoice_id);
    if (!itemMap[key]) itemMap[key] = [];
    itemMap[key].push(item);
  }

  // Payments
  const { rows: payments } = await pgPool.query(`SELECT * FROM payments ORDER BY invoice_id`);
  const paymentMap: Record<string, Record<string, unknown>[]> = {};
  for (const p of payments) {
    const key = String(p.invoice_id);
    if (!paymentMap[key]) paymentMap[key] = [];
    paymentMap[key].push(p);
  }

  const progress = startProgress('invoices', invoices.length);
  const invoiceDocs = [];
  const paymentDocs = [];

  for (const row of invoices) {
    try {
      const _id = new mongoose.Types.ObjectId();
      setIdMapping('invoices', row.id, _id);

      const invItems = itemMap[String(row.id)] || [];
      const invPayments = paymentMap[String(row.id)] || [];

      invoiceDocs.push({
        _id,
        tenantSlug: row.tenant_slug,
        invoiceNumber: row.invoice_number || `MIG-INV-${row.id}`,
        patientId: getIdMapping('patients', row.patient_id) || null,
        doctorId: getIdMapping('users', row.doctor_id) || null,
        items: invItems.map((item: Record<string, unknown>) => ({
          description: item.description || item.service_name || '',
          quantity: parseInt(item.quantity as string) || 1,
          unitPrice: parseFloat(item.unit_price as string) || 0,
          total: parseFloat(item.total as string) || 0,
          toothNumber: item.tooth_number || null,
        })),
        subtotal: parseFloat(row.subtotal) || 0,
        discount: parseFloat(row.discount) || 0,
        tax: parseFloat(row.tax) || 0,
        total: parseFloat(row.total) || 0,
        paidAmount: parseFloat(row.paid_amount) || 0,
        status: row.status || 'draft',
        dueDate: toDate(row.due_date),
        notes: row.notes || null,
        createdBy: getIdMapping('users', row.created_by) || null,
        createdAt: toDate(row.created_at) ?? new Date(),
        updatedAt: toDate(row.updated_at) ?? new Date(),
      });

      // Payments as separate documents
      for (const p of invPayments) {
        const payId = new mongoose.Types.ObjectId();
        setIdMapping('payments', p.id as number, payId);
        paymentDocs.push({
          _id: payId,
          tenantSlug: row.tenant_slug,
          invoiceId: _id,
          patientId: getIdMapping('patients', row.patient_id) || null,
          amount: parseFloat(p.amount as string) || 0,
          method: (p.payment_method as string) || 'cash',
          referenceNumber: p.reference_number || null,
          status: (p.status as string) || 'completed',
          paidAt: toDate(p.paid_at as string) ?? toDate(p.created_at as string),
          createdBy: getIdMapping('users', p.created_by as number) || null,
          createdAt: toDate(p.created_at as string) ?? new Date(),
        });
      }

      updateProgress('invoices');
    } catch (error) {
      errorProgress('invoices');
      migrationLog.error(`Failed to transform invoice ${row.id}:`, error);
    }
  }

  if (!dryRun) {
    const db = mongoose.connection.db!;
    if (invoiceDocs.length > 0) {
      await db
        .collection('invoices')
        .insertMany(invoiceDocs, { ordered: false })
        .catch(() => {});
    }
    if (paymentDocs.length > 0) {
      await db
        .collection('payments')
        .insertMany(paymentDocs, { ordered: false })
        .catch(() => {});
    }
    migrationLog.info(`Also migrated ${paymentDocs.length} payment records`);
  }

  finishProgress('invoices');

  return {
    step: 'invoices',
    total: invoices.length,
    migrated: progress.processed,
    skipped: progress.skipped,
    errors: progress.errors,
    durationMs: Date.now() - start,
  };
}
