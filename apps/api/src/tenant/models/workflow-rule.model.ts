/**
 * Workflow Rule Model — Tenant Database (tenant_{slug})
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 — Workflow Engine
 *
 * Event → Condition → Action automation (BullMQ-based).
 * Free for all tenants — automates features the tenant already has access to.
 *
 * Two collections:
 *   - workflow_rules: Rule definitions (trigger, conditions, actions)
 *   - workflow_executions: Execution log (audit trail)
 */

import { Schema, type Document, type Connection, type Model, type Types } from 'mongoose';

// ── Types ───────────────────────────────────────────────────

export type WorkflowTrigger =
  | 'appointment.created'
  | 'appointment.confirmed'
  | 'appointment.completed'
  | 'appointment.cancelled'
  | 'appointment.no_show'
  | 'patient.created'
  | 'patient.updated'
  | 'invoice.created'
  | 'invoice.overdue'
  | 'payment.received'
  | 'treatment_plan.accepted'
  | 'lab_order.delivered'
  | 'inventory.low_stock'
  | 'inventory.expiring'
  | 'schedule.slot_available'
  | 'custom';

export type WorkflowActionType =
  | 'send_notification'
  | 'send_email'
  | 'send_sms'
  | 'send_whatsapp'
  | 'update_status'
  | 'create_task'
  | 'trigger_webhook'
  | 'schedule_followup'
  | 'log_event';

interface ICondition {
  field: string;
  operator:
    | 'equals'
    | 'not_equals'
    | 'contains'
    | 'gt'
    | 'gte'
    | 'lt'
    | 'lte'
    | 'in'
    | 'not_in'
    | 'exists'
    | 'not_exists';
  value: unknown;
}

interface IAction {
  type: WorkflowActionType;
  config: Record<string, unknown>;
  delayMinutes: number;
}

export interface IWorkflowRule extends Document {
  name: { en: string; ar?: string };
  description?: { en?: string; ar?: string };
  trigger: WorkflowTrigger;
  conditions: ICondition[];
  conditionLogic: 'all' | 'any';
  actions: IAction[];
  isActive: boolean;
  priority: number;
  maxExecutionsPerDay: number;
  executionCount: number;
  lastExecutedAt: Date | null;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export type WorkflowRuleModel = Model<IWorkflowRule>;

export interface IWorkflowExecution extends Document {
  workflowId: Types.ObjectId;
  trigger: string;
  triggerData: Record<string, unknown>;
  status: 'success' | 'failed' | 'skipped';
  actionsExecuted: {
    actionType: string;
    status: 'success' | 'failed';
    result?: Record<string, unknown>;
    error?: string;
    executedAt: Date;
  }[];
  duration: number; // ms
  error?: string;
  createdAt: Date;
}

export type WorkflowExecutionModel = Model<IWorkflowExecution>;

// ── Sub-Schemas ─────────────────────────────────────────────

const bilingualSchema = new Schema(
  { en: { type: String, default: '' }, ar: { type: String, default: '' } },
  { _id: false },
);

const conditionSchema = new Schema(
  {
    field: { type: String, required: true },
    operator: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    value: { type: Schema.Types.Mixed },
  },
  { _id: false },
);

const actionSchema = new Schema(
  {
    type: {
      type: String,
      required: true,
      enum: [
        'send_notification',
        'send_email',
        'send_sms',
        'send_whatsapp',
        'update_status',
        'create_task',
        'trigger_webhook',
        'schedule_followup',
        'log_event',
      ],
    },
    config: { type: Schema.Types.Mixed, default: {} },
    delayMinutes: { type: Number, default: 0, min: 0 },
  },
  { _id: false },
);

const actionExecutionSchema = new Schema(
  {
    actionType: { type: String, required: true },
    status: { type: String, enum: ['success', 'failed'], required: true },
    result: { type: Schema.Types.Mixed },
    error: String,
    executedAt: { type: Date, default: Date.now },
  },
  { _id: false },
);

// ── Workflow Rule Schema ────────────────────────────────────

const workflowRuleSchema = new Schema<IWorkflowRule>(
  {
    name: { type: bilingualSchema, required: true },
    description: bilingualSchema,
    trigger: {
      type: String,
      required: true,
      enum: [
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
      ],
    },
    conditions: [conditionSchema],
    conditionLogic: { type: String, enum: ['all', 'any'], default: 'all' },
    actions: [actionSchema],
    isActive: { type: Boolean, default: true },
    priority: { type: Number, default: 50, min: 1, max: 100 },
    maxExecutionsPerDay: { type: Number, default: 0, min: 0 },
    executionCount: { type: Number, default: 0 },
    lastExecutedAt: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  },
  {
    timestamps: true,
    collection: 'workflow_rules',
  },
);

// ── Workflow Execution Schema ───────────────────────────────

const workflowExecutionSchema = new Schema<IWorkflowExecution>(
  {
    workflowId: { type: Schema.Types.ObjectId, ref: 'WorkflowRule', required: true },
    trigger: { type: String, required: true },
    triggerData: { type: Schema.Types.Mixed, default: {} },
    status: { type: String, enum: ['success', 'failed', 'skipped'], required: true },
    actionsExecuted: [actionExecutionSchema],
    duration: { type: Number, default: 0 },
    error: String,
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'workflow_executions',
  },
);

// ── Indexes ─────────────────────────────────────────────────

workflowRuleSchema.index({ trigger: 1, isActive: 1 });
workflowRuleSchema.index({ isActive: 1, priority: -1 });

workflowExecutionSchema.index({ workflowId: 1, createdAt: -1 });
workflowExecutionSchema.index({ status: 1, createdAt: -1 });
workflowExecutionSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 }); // 90 days TTL

// ── WeakMap Cache ───────────────────────────────────────────

const ruleCache = new WeakMap<Connection, WorkflowRuleModel>();
const execCache = new WeakMap<Connection, WorkflowExecutionModel>();

export function getWorkflowRuleModel(conn: Connection): WorkflowRuleModel {
  if (ruleCache.has(conn)) return ruleCache.get(conn)!;
  const model = conn.model<IWorkflowRule>('WorkflowRule', workflowRuleSchema);
  ruleCache.set(conn, model);
  return model;
}

export function getWorkflowExecutionModel(conn: Connection): WorkflowExecutionModel {
  if (execCache.has(conn)) return execCache.get(conn)!;
  const model = conn.model<IWorkflowExecution>('WorkflowExecution', workflowExecutionSchema);
  execCache.set(conn, model);
  return model;
}
