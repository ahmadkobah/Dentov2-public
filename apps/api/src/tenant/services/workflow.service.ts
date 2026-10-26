/**
 * Workflow Service — Business Logic
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 — Workflow Rules
 * Event-driven automation: Trigger → Conditions → Actions
 * BullMQ-driven execution with delay support.
 */

import type { Connection, QueryFilter } from 'mongoose';
import mongoose from 'mongoose';
import {
  getWorkflowRuleModel,
  getWorkflowExecutionModel,
  type IWorkflowRule,
  type IWorkflowExecution,
} from '../models/workflow-rule.model.js';
import { regexContains } from './search.helpers.js';
import { ApiError } from '../../utils/api-response.js';
import { logger } from '../../utils/logger.js';

export class WorkflowService {
  private WorkflowRuleModel;
  private WorkflowExecutionModel;

  constructor(tenantDb: Connection) {
    this.WorkflowRuleModel = getWorkflowRuleModel(tenantDb);
    this.WorkflowExecutionModel = getWorkflowExecutionModel(tenantDb);
  }

  // ── CRUD ────────────────────────────────────────────────

  async list(query: {
    trigger?: string;
    isActive?: boolean;
    page?: number;
    limit?: number;
    search?: string;
  }) {
    const { trigger, isActive, page = 1, limit = 20, search } = query;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};

    if (trigger) filter.trigger = trigger;
    if (isActive !== undefined) filter.isActive = isActive;
    if (search) {
      filter.$or = [
        { 'name.en': regexContains(search) },
        { 'name.ar': regexContains(search) },
        { 'description.en': regexContains(search) },
        { 'description.ar': regexContains(search) },
      ];
    }

    const [data, total] = await Promise.all([
      this.WorkflowRuleModel.find(filter)
        .sort({ priority: -1, createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.WorkflowRuleModel.countDocuments(filter),
    ]);

    return {
      workflows: data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async getById(id: string) {
    const doc = await this.WorkflowRuleModel.findById(id).lean();
    if (!doc) throw new ApiError(404, 'Workflow rule not found', 'WORKFLOW_NOT_FOUND');
    return doc;
  }

  async create(input: Partial<IWorkflowRule>, userId: string) {
    const doc = await this.WorkflowRuleModel.create({
      ...input,
      createdBy: new mongoose.Types.ObjectId(userId),
    });
    return doc.toObject();
  }

  async update(id: string, input: Partial<IWorkflowRule>, userId: string) {
    const doc = await this.WorkflowRuleModel.findByIdAndUpdate(
      id,
      { $set: { ...input, updatedBy: new mongoose.Types.ObjectId(userId) } },
      { new: true, lean: true },
    );
    if (!doc) throw new ApiError(404, 'Workflow rule not found', 'WORKFLOW_NOT_FOUND');
    return doc;
  }

  async toggleActive(id: string, isActive: boolean, userId: string) {
    const doc = await this.WorkflowRuleModel.findByIdAndUpdate(
      id,
      { $set: { isActive, updatedBy: new mongoose.Types.ObjectId(userId) } },
      { new: true, lean: true },
    );
    if (!doc) throw new ApiError(404, 'Workflow rule not found', 'WORKFLOW_NOT_FOUND');
    return doc;
  }

  async delete(id: string) {
    const doc = await this.WorkflowRuleModel.findByIdAndDelete(id);
    if (!doc) throw new ApiError(404, 'Workflow rule not found', 'WORKFLOW_NOT_FOUND');
  }

  // ── Execution Logic ─────────────────────────────────────

  /**
   * Find all active workflows that match a given trigger event.
   */
  async findMatchingWorkflows(trigger: string): Promise<IWorkflowRule[]> {
    const now = new Date();

    const matchFilter: QueryFilter<IWorkflowRule> = {
      trigger: trigger as IWorkflowRule['trigger'],
      isActive: true,
      $or: [{ validFrom: { $exists: false } }, { validFrom: null }, { validFrom: { $lte: now } }],
      $and: [
        {
          $or: [
            { validUntil: { $exists: false } },
            { validUntil: null },
            { validUntil: { $gte: now } },
          ],
        },
      ],
    };

    return this.WorkflowRuleModel.find(matchFilter)
      .sort({ priority: -1 })
      .lean() as unknown as Promise<IWorkflowRule[]>;
  }

  /**
   * Evaluate conditions against event data.
   * Returns true if all/any conditions pass based on conditionLogic.
   */
  evaluateConditions(
    conditions: IWorkflowRule['conditions'],
    conditionLogic: 'all' | 'any',
    data: Record<string, unknown>,
  ): boolean {
    if (!conditions || conditions.length === 0) return true;

    const results = conditions.map((cond) => {
      const fieldValue = this.getNestedValue(data, cond.field);
      return this.evaluateOperator(fieldValue, cond.operator, cond.value);
    });

    return conditionLogic === 'all' ? results.every(Boolean) : results.some(Boolean);
  }

  /**
   * Record a workflow execution result
   */
  async recordExecution(
    workflowId: string,
    trigger: string,
    eventData: Record<string, unknown>,
    status: 'success' | 'partial' | 'failed',
    actionsExecuted: Array<{
      actionType: string;
      status: 'success' | 'failed';
      result?: unknown;
      error?: string;
    }>,
    duration: number,
    errorMessage?: string,
  ) {
    // The workflow_executions schema stores the event payload under
    // `triggerData` and the error under `error` (the create literal previously
    // used the parameter names `eventData` / `errorMessage`, which are not
    // schema fields and were silently dropped by mongoose strict mode). Mapping
    // to the real schema fields here. `status` and `actionsExecuted` are cast to
    // the schema's declared types — the model interface narrows them more than
    // the underlying Mixed schema paths, so these casts are runtime no-ops.
    await this.WorkflowExecutionModel.create({
      workflowId: new mongoose.Types.ObjectId(workflowId),
      trigger,
      triggerData: eventData,
      status: status as IWorkflowExecution['status'],
      actionsExecuted: actionsExecuted as IWorkflowExecution['actionsExecuted'],
      duration,
      error: errorMessage,
    });

    // Increment execution count on the rule
    await this.WorkflowRuleModel.findByIdAndUpdate(workflowId, {
      $inc: { executionCount: 1 },
      $set: { lastExecutedAt: new Date() },
    });
  }

  /**
   * Get execution history for a workflow
   */
  async getExecutionHistory(query: {
    workflowId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }) {
    const { workflowId, status, page = 1, limit = 20 } = query;
    const skip = (page - 1) * limit;
    const filter: Record<string, unknown> = {};

    if (workflowId) filter.workflowId = new mongoose.Types.ObjectId(workflowId);
    if (status) filter.status = status;

    const [data, total] = await Promise.all([
      this.WorkflowExecutionModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      this.WorkflowExecutionModel.countDocuments(filter),
    ]);

    return {
      executions: data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // ── Private Helpers ─────────────────────────────────────

  private getNestedValue(obj: Record<string, unknown>, path: string): unknown {
    return path.split('.').reduce((acc: unknown, key: string) => {
      if (acc && typeof acc === 'object') {
        return (acc as Record<string, unknown>)[key];
      }
      return undefined;
    }, obj);
  }

  private evaluateOperator(fieldValue: unknown, operator: string, compareValue: unknown): boolean {
    try {
      switch (operator) {
        case 'eq':
          return fieldValue === compareValue;
        case 'neq':
          return fieldValue !== compareValue;
        case 'gt':
          return Number(fieldValue) > Number(compareValue);
        case 'gte':
          return Number(fieldValue) >= Number(compareValue);
        case 'lt':
          return Number(fieldValue) < Number(compareValue);
        case 'lte':
          return Number(fieldValue) <= Number(compareValue);
        case 'contains':
          return String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
        case 'not_contains':
          return !String(fieldValue).toLowerCase().includes(String(compareValue).toLowerCase());
        case 'starts_with':
          return String(fieldValue).toLowerCase().startsWith(String(compareValue).toLowerCase());
        case 'ends_with':
          return String(fieldValue).toLowerCase().endsWith(String(compareValue).toLowerCase());
        case 'in':
          return Array.isArray(compareValue) && compareValue.includes(fieldValue);
        case 'not_in':
          return Array.isArray(compareValue) && !compareValue.includes(fieldValue);
        default:
          logger.warn({ operator }, 'Unknown workflow condition operator');
          return false;
      }
    } catch {
      return false;
    }
  }
}
