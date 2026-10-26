/**
 * Workflow Execution Worker
 *
 * Per DENTO_V2_MASTER_PLAN.md §10 — Workflow Rules
 * Per IMPLEMENTATION_ROADMAP — Week 13 Task 8
 *
 * BullMQ worker that processes triggered workflow events.
 * Evaluates conditions, executes actions (send notification, update status, etc.).
 */

import type { Job } from 'bullmq';
import { QUEUE_NAMES, createWorker, getQueue } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { getTenantDb } from '../../config/database.js';
import { WorkflowService } from '../../tenant/services/workflow.service.js';
import { dispatchWebhook } from '../../tenant/services/webhook-dispatcher.js';
import { createNotificationModel } from '../../tenant/models/notification.model.js';
import { getAppointmentModel } from '../../tenant/models/appointment.model.js';
import { getPatientModel } from '../../tenant/models/patient.model.js';

// ── Types ─────────────────────────────────────────────────

interface WorkflowJobData {
  tenantSlug: string;
  trigger: string;
  eventData: Record<string, unknown>;
}

// ── Worker ────────────────────────────────────────────────

export function startWorkflowExecutionWorker() {
  const worker = createWorker(
    QUEUE_NAMES.WORKFLOW_EXECUTION,
    async (job: Job<WorkflowJobData>) => {
      const { tenantSlug, trigger, eventData } = job.data;
      const startTime = Date.now();

      const tenantDb = await getTenantDb(tenantSlug);
      const service = new WorkflowService(tenantDb);

      // Find all matching active workflows
      const workflows = await service.findMatchingWorkflows(trigger);

      for (const workflow of workflows) {
        const wfStartTime = Date.now();
        const actionsExecuted: Array<{
          actionType: string;
          status: 'success' | 'failed';
          result?: unknown;
          error?: string;
        }> = [];

        try {
          // Check daily execution limit
          if (workflow.maxExecutionsPerDay && workflow.maxExecutionsPerDay > 0) {
            const todayStart = new Date();
            todayStart.setHours(0, 0, 0, 0);

            const { getWorkflowExecutionModel } =
              await import('../../tenant/models/workflow-rule.model.js');
            const ExecutionModel = getWorkflowExecutionModel(tenantDb);
            const todayCount = await ExecutionModel.countDocuments({
              workflowId: workflow._id,
              createdAt: { $gte: todayStart },
            });

            if (todayCount >= workflow.maxExecutionsPerDay) {
              await service.recordExecution(
                workflow._id.toString(),
                trigger,
                eventData,
                'success',
                [
                  {
                    actionType: 'limit_check',
                    status: 'success',
                    result: `Daily limit reached (${todayCount}/${workflow.maxExecutionsPerDay})`,
                  },
                ],
                Date.now() - wfStartTime,
              );
              continue;
            }
          }

          // Evaluate conditions
          const conditionsMet = service.evaluateConditions(
            workflow.conditions,
            workflow.conditionLogic || 'all',
            eventData,
          );

          if (!conditionsMet) {
            await service.recordExecution(
              workflow._id.toString(),
              trigger,
              eventData,
              'success',
              [
                {
                  actionType: 'condition_check',
                  status: 'success',
                  result: 'Conditions not met — skipped',
                },
              ],
              Date.now() - wfStartTime,
            );
            continue;
          }

          // Execute actions in order
          for (const action of workflow.actions) {
            try {
              // If action has delay, queue it for later
              if (action.delayMinutes && action.delayMinutes > 0) {
                const queue = getQueue(QUEUE_NAMES.WORKFLOW_EXECUTION);
                await queue.add(
                  'delayed-action',
                  {
                    tenantSlug,
                    workflowId: workflow._id.toString(),
                    action,
                    eventData,
                  },
                  { delay: action.delayMinutes * 60_000 },
                );

                actionsExecuted.push({
                  actionType: action.type,
                  status: 'success',
                  result: `Delayed by ${action.delayMinutes} minutes`,
                });
                continue;
              }

              const result = await executeAction(tenantDb, action, eventData);
              actionsExecuted.push({
                actionType: action.type,
                status: 'success',
                result,
              });
            } catch (actionErr) {
              actionsExecuted.push({
                actionType: action.type,
                status: 'failed',
                error: (actionErr as Error).message,
              });
            }
          }

          const hasFailure = actionsExecuted.some((a) => a.status === 'failed');
          const allFailed = actionsExecuted.every((a) => a.status === 'failed');

          await service.recordExecution(
            workflow._id.toString(),
            trigger,
            eventData,
            allFailed ? 'failed' : hasFailure ? 'partial' : 'success',
            actionsExecuted,
            Date.now() - wfStartTime,
          );
        } catch (err) {
          await service.recordExecution(
            workflow._id.toString(),
            trigger,
            eventData,
            'failed',
            actionsExecuted,
            Date.now() - wfStartTime,
            (err as Error).message,
          );

          logger.error(
            {
              workflowId: workflow._id,
              trigger,
              err,
            },
            'Workflow execution failed',
          );
        }
      }

      logger.debug(
        {
          tenantSlug,
          trigger,
          workflowCount: workflows.length,
          duration: Date.now() - startTime,
        },
        'Workflow trigger processed',
      );
    },
    { concurrency: 10 },
  );

  logger.info('Workflow Execution worker started');
  return worker;
}

// ── Trigger Helper — Queue a workflow event ───────────────

export async function triggerWorkflow(
  tenantSlug: string,
  trigger: string,
  eventData: Record<string, unknown>,
) {
  const queue = getQueue(QUEUE_NAMES.WORKFLOW_EXECUTION);
  await queue.add('workflow-trigger', {
    tenantSlug,
    trigger,
    eventData,
  });
}

// ── Action Executor ───────────────────────────────────────

async function executeAction(
  tenantDb: any,
  action: { type: string; config: Record<string, unknown> },
  eventData: Record<string, unknown>,
): Promise<unknown> {
  switch (action.type) {
    case 'send_notification': {
      const Notification = createNotificationModel(tenantDb);
      // Dynamic workflow payload (string title/body, extra fields); typed loosely
      // so Mongoose 9's stricter create casting accepts the runtime shape unchanged.
      const notificationDoc: Record<string, unknown> = {
        type: action.config.notificationType || 'workflow',
        recipientId: eventData.patientId || eventData.userId,
        recipientType: action.config.recipientType || 'user',
        title: interpolateTemplate(action.config.title as string, eventData),
        body: interpolateTemplate(action.config.body as string, eventData),
        channels: action.config.channels || ['in_app'],
        data: { source: 'workflow', eventData },
      };
      const notification = await Notification.create(notificationDoc);
      return { notificationId: notification._id.toString() };
    }

    case 'send_email': {
      // Create notification with email channel via Notification model
      const EmailNotification = createNotificationModel(tenantDb);
      const emailNotificationDoc: Record<string, unknown> = {
        type: action.config.notificationType || 'workflow',
        recipientId: eventData.patientId || eventData.userId,
        recipientType: action.config.recipientType || 'user',
        title: interpolateTemplate(action.config.subject as string, eventData),
        body: interpolateTemplate(action.config.body as string, eventData),
        channels: ['email'],
        data: {
          source: 'workflow',
          to: action.config.to || eventData.email,
          eventData,
        },
      };
      const emailNotif = await EmailNotification.create(emailNotificationDoc);
      return { notificationId: emailNotif._id.toString(), channel: 'email' };
    }

    case 'send_sms': {
      // Create notification with sms channel via Notification model
      const SmsNotification = createNotificationModel(tenantDb);
      const smsNotificationDoc: Record<string, unknown> = {
        type: action.config.notificationType || 'workflow',
        recipientId: eventData.patientId || eventData.userId,
        recipientType: action.config.recipientType || 'patient',
        title: interpolateTemplate(
          (action.config.title as string) || 'SMS Notification',
          eventData,
        ),
        body: interpolateTemplate(action.config.body as string, eventData),
        channels: ['sms'],
        data: {
          source: 'workflow',
          to: action.config.to || eventData.phone,
          eventData,
        },
      };
      const smsNotif = await SmsNotification.create(smsNotificationDoc);
      return { notificationId: smsNotif._id.toString(), channel: 'sms' };
    }

    case 'update_status': {
      const model = tenantDb.model(action.config.model as string);
      const result = await model.findByIdAndUpdate(
        eventData.resourceId || eventData._id,
        { $set: { status: action.config.newStatus } },
        { new: true },
      );
      return { updated: !!result, newStatus: action.config.newStatus };
    }

    case 'create_task': {
      logger.info({ config: action.config, eventData }, 'Workflow create_task action');
      return { created: true };
    }

    case 'create_follow_up': {
      const Appointment = getAppointmentModel(tenantDb);
      // Dynamic event-derived ids/values are cast/stored by Mongoose; payload typed
      // loosely so Mongoose 9's stricter create casting accepts them unchanged.
      const followUpDoc: Record<string, unknown> = {
        patientId: eventData.patientId,
        appointmentTypeId: action.config.appointmentTypeId,
        startTime: new Date(
          Date.now() + (Number(action.config.daysLater) || 7) * 24 * 60 * 60 * 1000,
        ),
        status: 'scheduled',
        notes: interpolateTemplate(
          (action.config.notes as string) || 'Follow-up appointment',
          eventData,
        ),
      };
      const followUp = await Appointment.create(followUpDoc);
      return { appointmentId: followUp._id.toString() };
    }

    case 'add_tag': {
      const Patient = getPatientModel(tenantDb);
      await Patient.findByIdAndUpdate(eventData.patientId, {
        $addToSet: { tags: action.config.tag },
      });
      return { tagged: true, tag: action.config.tag };
    }

    case 'webhook': {
      // Dispatch to webhook system via the tenant webhook dispatcher
      const dispatched = await dispatchWebhook(tenantDb, {
        tenantId: (eventData.tenantId as string) || '',
        tenantSlug: (eventData.tenantSlug as string) || '',
        event: (action.config.event as any) || 'workflow.executed',
        data: {
          source: 'workflow',
          url: action.config.url,
          ...eventData,
        },
      });
      return { dispatched: true, endpointsNotified: dispatched };
    }

    case 'log': {
      logger.info({ workflow: action.config, eventData }, 'Workflow log action');
      return { logged: true };
    }

    default:
      logger.warn({ actionType: action.type }, 'Unknown workflow action type');
      return { skipped: true, reason: 'Unknown action type' };
  }
}

// ── Template Interpolation ────────────────────────────────

function interpolateTemplate(template: string | undefined, data: Record<string, unknown>): string {
  if (!template) return '';
  return template.replace(/\{\{(\w+(?:\.\w+)*)\}\}/g, (_, path: string) => {
    const value = path.split('.').reduce((obj: unknown, key: string) => {
      if (obj && typeof obj === 'object') return (obj as Record<string, unknown>)[key];
      return undefined;
    }, data);
    return value !== undefined ? String(value) : `{{${path}}}`;
  });
}
