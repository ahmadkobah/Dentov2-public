/**
 * Appointment Reminder Cron Job
 *
 * Per DENTO_V2_MASTER_PLAN.md §20 — Benachrichtigungssystem
 * Per IMPLEMENTATION_ROADMAP — Week 13 Task 1
 *
 * Runs every 15 minutes. Scans for upcoming appointments and
 * queues reminder notifications at configured intervals (e.g. 24h, 2h, 30min).
 */

import { type Job } from 'bullmq';
import mongoose from 'mongoose';
import { QUEUE_NAMES, getQueue, addCronJob, createWorker } from '../queue.js';
import { logger } from '../../utils/logger.js';
import { getTenantDb } from '../../config/database.js';
import type { ITenant } from '../../platform/models/tenant.model.js';
import { getAppointmentModel } from '../../tenant/models/appointment.model.js';
import { getSettingsModel } from '../../tenant/models/settings.model.js';
import { getPatientModel } from '../../tenant/models/patient.model.js';
import { NotificationService } from '../../services/notification.service.js';
import {
  buildReminderFilter,
  combineAppointmentDateTime,
  getReminderWindow,
  isAppointmentInReminderWindow,
} from './reminder-window.js';

// ── Constants ─────────────────────────────────────────────

const REMINDER_INTERVALS_MINUTES = [1440, 60, 30]; // 24h, 1h, 30min

// ── Cron Registration ─────────────────────────────────────

export async function startReminderCron() {
  // Run every 15 minutes
  await addCronJob(QUEUE_NAMES.APPOINTMENT_REMINDERS, 'scan-upcoming-appointments', '*/15 * * * *');

  logger.info('Appointment Reminder cron registered (every 15 min)');
}

// ── Worker ────────────────────────────────────────────────

export function startReminderWorker() {
  const worker = createWorker(
    QUEUE_NAMES.APPOINTMENT_REMINDERS,
    async (job: Job) => {
      if (job.name === 'scan-upcoming-appointments') {
        await scanAndQueueReminders();
        return;
      }

      if (job.name === 'send-reminder') {
        await sendReminder(job.data);
        return;
      }
    },
    { concurrency: 10 },
  );

  logger.info('Appointment Reminder worker started');
  return worker;
}

// ── Core Logic ────────────────────────────────────────────

async function scanAndQueueReminders() {
  const platformDb = mongoose.connection;

  // Get all active tenants
  const Tenant = platformDb.model<ITenant>('Tenant');
  const tenants = await Tenant.find({ status: 'active' }).select('slug').lean();

  const queue = getQueue(QUEUE_NAMES.APPOINTMENT_REMINDERS);
  let totalQueued = 0;

  for (const tenant of tenants) {
    try {
      const tenantDb = await getTenantDb(tenant.slug);
      const Appointment = getAppointmentModel(tenantDb);
      const Settings = getSettingsModel(tenantDb);

      // Get tenant's notification settings
      const notifSettings = await Settings.findOne({ key: 'notifications' }).lean();
      const reminderEnabled = (notifSettings?.value as any)?.appointmentReminders !== false;

      if (!reminderEnabled) continue;

      // Get configured reminder intervals (or use defaults)
      const appointmentSettings = await Settings.findOne({ key: 'appointment' }).lean();
      const intervals =
        (appointmentSettings?.value as any)?.reminderMinutesBefore || REMINDER_INTERVALS_MINUTES;

      const now = new Date();

      for (const minutesBefore of intervals) {
        const { windowStart, windowEnd } = getReminderWindow(now, minutesBefore);

        const appointments = await Appointment.find(
          buildReminderFilter(windowStart, windowEnd, minutesBefore),
        )
          .select('_id patientId date startTime endTime appointmentTypeId notes')
          .lean();

        for (const apt of appointments) {
          if (!isAppointmentInReminderWindow(apt, windowStart, windowEnd)) continue;

          const appointmentTime = combineAppointmentDateTime(apt.date, apt.startTime);

          await queue.add('send-reminder', {
            tenantSlug: tenant.slug,
            appointmentId: apt._id.toString(),
            patientId: apt.patientId?.toString(),
            appointmentTime: appointmentTime.toISOString(),
            minutesBefore,
          });

          // Mark as queued so we don't re-queue
          await Appointment.updateOne(
            { _id: apt._id },
            {
              $set: {
                [`reminderSent.${minutesBefore}`]: true,
                isReminderSent: true,
                reminderSentAt: new Date(),
              },
            },
          );

          totalQueued++;
        }
      }
    } catch (err) {
      logger.error({ tenantSlug: tenant.slug, err }, 'Error scanning tenant for reminders');
    }
  }

  if (totalQueued > 0) {
    logger.info({ totalQueued }, 'Appointment reminders queued');
  }
}

async function sendReminder(data: {
  tenantSlug: string;
  appointmentId: string;
  patientId: string;
  appointmentTime: string;
  minutesBefore: number;
}) {
  try {
    const tenantDb = await getTenantDb(data.tenantSlug);

    // Get patient contact info
    const Patient = getPatientModel(tenantDb);
    const patient = await Patient.findById(data.patientId)
      .select('firstName lastName phone email preferredLanguage')
      .lean();

    if (!patient) {
      logger.warn({ appointmentId: data.appointmentId }, 'Patient not found for reminder');
      return;
    }

    // Use NotificationService for proper multi-channel delivery
    const notificationService = new NotificationService(tenantDb, data.tenantSlug);

    const title =
      data.minutesBefore >= 1440
        ? 'Appointment Tomorrow'
        : `Appointment in ${data.minutesBefore} minutes`;
    const appointmentTime = new Date(data.appointmentTime).toLocaleString();
    const body = `You have an appointment scheduled for ${appointmentTime}`;

    await notificationService.send({
      templateKey: 'appointment.reminder',
      tenantId: data.tenantSlug,
      recipients: [
        {
          patientId: data.patientId,
          email: (patient as any).email,
          phone: (patient as any).phone,
        },
      ],
      variables: {
        patientName:
          `${(patient as any).firstName || ''} ${(patient as any).lastName || ''}`.trim(),
        appointmentTime,
        minutesBefore: String(data.minutesBefore),
        title,
        body,
      },
      relatedEntity: {
        type: 'appointment',
        id: data.appointmentId,
      },
    });

    logger.debug(
      {
        tenantSlug: data.tenantSlug,
        appointmentId: data.appointmentId,
        minutesBefore: data.minutesBefore,
      },
      'Appointment reminder sent',
    );
  } catch (err) {
    logger.error({ ...data, err }, 'Failed to send appointment reminder');
    throw err; // Let BullMQ retry
  }
}
