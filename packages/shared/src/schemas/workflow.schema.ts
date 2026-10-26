/**
 * Workflow Schemas — Zod Validation
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 — Workflow Engine
 * Event → Condition → Action automation (BullMQ-based, free for all tenants)
 */

import { z } from 'zod';

// ── Trigger Event Enum ──────────────────────────────────────

export const workflowTriggerEnum = z.enum([
  'appointment.created',
  'appointment.confirmed',
  'appointment.completed',
  'appointment.cancelled',
  'appointment.no_show',
  'patient.created',
  'patient.updated',
  'invoice.created',
  'invoice.overdue',
  'payment.received',
  'treatment_plan.accepted',
  'lab_order.delivered',
  'inventory.low_stock',
  'inventory.expiring',
  'schedule.slot_available',
  'custom',
]);

// ── Action Type Enum ────────────────────────────────────────

export const workflowActionEnum = z.enum([
  'send_notification',
  'send_email',
  'send_sms',
  'send_whatsapp',
  'update_status',
  'create_task',
  'trigger_webhook',
  'schedule_followup',
  'log_event',
]);

// ── Condition Schema ────────────────────────────────────────

const conditionSchema = z.object({
  field: z.string().min(1).max(100),
  operator: z.enum([
    'equals',
    'not_equals',
    'contains',
    'gt',
    'gte',
    'lt',
    'lte',
    'in',
    'not_in',
    'exists',
    'not_exists',
  ]),
  value: z.unknown(),
});

// ── Action Schema ───────────────────────────────────────────

const actionSchema = z.object({
  type: workflowActionEnum,
  config: z.record(z.string(), z.unknown()),
  delayMinutes: z.number().min(0).max(43200).default(0), // Max 30 days
});

// ── Create Workflow Schema ──────────────────────────────────

export const createWorkflowSchema = z.object({
  name: z.object({
    en: z.string().min(1).max(100),
    ar: z.string().max(100).optional(),
  }),
  description: z
    .object({
      en: z.string().max(500).optional(),
      ar: z.string().max(500).optional(),
    })
    .optional(),
  trigger: workflowTriggerEnum,
  conditions: z.array(conditionSchema).default([]),
  conditionLogic: z.enum(['all', 'any']).default('all'),
  actions: z.array(actionSchema).min(1).max(10),
  isActive: z.boolean().default(true),
  priority: z.number().int().min(1).max(100).default(50),
  maxExecutionsPerDay: z.number().int().min(0).max(10000).default(0), // 0 = unlimited
});

// ── Update Workflow Schema ──────────────────────────────────

export const updateWorkflowSchema = z.object({
  name: z
    .object({
      en: z.string().min(1).max(100),
      ar: z.string().max(100).optional(),
    })
    .optional(),
  description: z
    .object({
      en: z.string().max(500).optional(),
      ar: z.string().max(500).optional(),
    })
    .optional(),
  conditions: z.array(conditionSchema).optional(),
  conditionLogic: z.enum(['all', 'any']).optional(),
  actions: z.array(actionSchema).min(1).max(10).optional(),
  isActive: z.boolean().optional(),
  priority: z.number().int().min(1).max(100).optional(),
  maxExecutionsPerDay: z.number().int().min(0).max(10000).optional(),
});

// ── Query Schema ────────────────────────────────────────────

export const workflowQuerySchema = z.object({
  trigger: workflowTriggerEnum.optional(),
  isActive: z.coerce.boolean().optional(),
  search: z.string().max(100).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Workflow Execution Log Query ────────────────────────────

export const workflowExecutionQuerySchema = z.object({
  workflowId: z.string().optional(),
  status: z.enum(['success', 'failed', 'skipped']).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

// ── Inferred Types ──────────────────────────────────────────

export type WorkflowTrigger = z.infer<typeof workflowTriggerEnum>;
export type WorkflowAction = z.infer<typeof workflowActionEnum>;
export type CreateWorkflowInput = z.infer<typeof createWorkflowSchema>;
export type UpdateWorkflowInput = z.infer<typeof updateWorkflowSchema>;
export type WorkflowQueryInput = z.infer<typeof workflowQuerySchema>;
export type WorkflowExecutionQueryInput = z.infer<typeof workflowExecutionQuerySchema>;
