import { z } from 'zod';

/**
 * Lab Order Schemas — CRUD + Status Update
 *
 * Per V2_DATABASE.md §5.12 — lab_orders collection
 * Per DENTO_V2_MASTER_PLAN.md §10 (#13) — Lab Orders
 */

const objectIdRegex = /^[0-9a-fA-F]{24}$/;
const objectId = z.string().regex(objectIdRegex, 'Invalid ObjectId');

const labOrderStatusEnum = z.enum([
  'draft',
  'sent',
  'in_progress',
  'ready',
  'delivered',
  'rejected',
  'cancelled',
]);

const attachmentTypeEnum = z.enum(['impression', 'photo', 'xray', 'prescription', 'other']);

const attachmentSchema = z.object({
  name: z.string().min(1).max(200),
  url: z.string().url().max(2000),
  type: attachmentTypeEnum.default('other'),
});

export const createLabOrderSchema = z
  .object({
    patientId: objectId,
    doctorId: objectId,
    branchId: objectId,
    dentalLabId: objectId,
    labOrderTypeId: objectId,
    treatmentPlanId: objectId.optional(),
    appointmentId: objectId.optional(),
    scanId: objectId.optional(),
    toothNumbers: z.array(z.string().max(5)).max(32).optional().default([]),
    shade: z.string().max(20).optional(),
    material: z.string().max(100).optional(),
    description: z.string().max(2000).optional(),
    specialInstructions: z.string().max(2000).optional(),
    orderDate: z.coerce.date().optional(),
    expectedDeliveryDate: z.coerce.date().optional(),
    cost: z.coerce.number().min(0).optional().default(0),
    attachments: z.array(attachmentSchema).max(20).optional().default([]),
  })
  .strict();

export const updateLabOrderSchema = z
  .object({
    dentalLabId: objectId.optional(),
    labOrderTypeId: objectId.optional(),
    treatmentPlanId: objectId.optional().nullable(),
    appointmentId: objectId.optional().nullable(),
    scanId: objectId.optional().nullable(),
    toothNumbers: z.array(z.string().max(5)).max(32).optional(),
    shade: z.string().max(20).optional(),
    material: z.string().max(100).optional(),
    description: z.string().max(2000).optional(),
    specialInstructions: z.string().max(2000).optional(),
    expectedDeliveryDate: z.coerce.date().optional(),
    tryInDate: z.coerce.date().optional().nullable(),
    tryInNotes: z.string().max(2000).optional(),
    adjustmentRequired: z.boolean().optional(),
    adjustmentNotes: z.string().max(2000).optional(),
    cost: z.coerce.number().min(0).optional(),
    isPaid: z.boolean().optional(),
    attachments: z.array(attachmentSchema).max(20).optional(),
  })
  .strict();

export const labOrderStatusUpdateSchema = z
  .object({
    status: labOrderStatusEnum,
    notes: z.string().max(2000).optional(),
    actualDeliveryDate: z.coerce.date().optional(),
  })
  .strict();

export const labOrderQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(100).optional(),
    status: labOrderStatusEnum.optional(),
    patientId: objectId.optional(),
    doctorId: objectId.optional(),
    dentalLabId: objectId.optional(),
    branchId: objectId.optional(),
    fromDate: z.coerce.date().optional(),
    toDate: z.coerce.date().optional(),
    sortBy: z
      .enum(['createdAt', 'orderDate', 'expectedDeliveryDate', 'status'])
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  })
  .strict();

export { labOrderStatusEnum, attachmentTypeEnum };
export type CreateLabOrderInput = z.infer<typeof createLabOrderSchema>;
export type UpdateLabOrderInput = z.infer<typeof updateLabOrderSchema>;
export type LabOrderStatusUpdate = z.infer<typeof labOrderStatusUpdateSchema>;
export type LabOrderQuery = z.infer<typeof labOrderQuerySchema>;
