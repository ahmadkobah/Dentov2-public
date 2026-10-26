/**
 * Dashboard Service — Aggregation queries for the free-tier dashboard
 *
 * Extracted from dashboard.route.ts to follow the service-layer pattern
 * used across all other tenant modules (invoices, payments, commissions, etc.).
 */

import type { Connection } from 'mongoose';
import { getAppointmentModel } from '../models/appointment.model.js';
import { getPatientModel } from '../models/patient.model.js';
import { getDoctorModel } from '../models/doctor.model.js';
import { getInvoiceModel } from '../models/invoice.model.js';
import { getInventoryStockModel } from '../models/inventory-stock.model.js';
import { getSettingsModel } from '../models/settings.model.js';

// ── Types ───────────────────────────────────────────────────

interface TodaysAppointments {
  booked: number;
  confirmed: number;
  completed: number;
  noShow: number;
  total: number;
}

interface RevenueMetric {
  amount: number;
  currency: string;
  trend: number;
}

interface PatientsMetric {
  newPatients: number;
  totalVisits: number;
  trend: number;
}

interface UpcomingAppointment {
  appointmentId: unknown;
  patientName: string;
  doctorName: string;
  time: unknown;
  service: unknown;
  status: unknown;
}

interface RecentPatient {
  patientId: unknown;
  name: string;
  lastVisit: unknown;
  phone: unknown;
}

interface LowStockAlert {
  itemId: unknown;
  name: unknown;
  currentQuantity: unknown;
  reorderLevel: unknown;
}

interface WaitingRoom {
  count: number;
  avgWaitMinutes: number;
}

export interface DashboardStats {
  todaysAppointments: TodaysAppointments;
  walkinsToday: number;
  revenueThisMonth: RevenueMetric;
  patientsThisMonth: PatientsMetric;
  upcomingAppointments: UpcomingAppointment[];
  recentPatients: RecentPatient[];
  lowStockAlerts: LowStockAlert[];
  waitingRoom: WaitingRoom;
}

interface TrendComparison {
  currentMonth: number;
  previousMonth: number;
  percentChange: number;
}

export interface DashboardTrends {
  revenueComparison: TrendComparison;
  appointmentComparison: TrendComparison;
  patientComparison: TrendComparison;
  noShowComparison: TrendComparison;
}

// ── Service ─────────────────────────────────────────────────

export class DashboardService {
  private tenantDb: Connection;

  constructor(tenantDb: Connection) {
    this.tenantDb = tenantDb;
  }

  /** Dashboard widget data (Free tier) */
  async getStats(): Promise<DashboardStats> {
    const Appointment = getAppointmentModel(this.tenantDb);
    const Patient = getPatientModel(this.tenantDb);
    // Register the Doctor schema on this tenant connection so the
    // .populate('doctorId') below doesn't throw MissingSchemaError when the
    // dashboard is the first request to touch the connection.
    getDoctorModel(this.tenantDb);
    const Invoice = getInvoiceModel(this.tenantDb);
    const InventoryStock = getInventoryStockModel(this.tenantDb);
    const Settings = getSettingsModel(this.tenantDb);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const todayEnd = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [
      todayAppts,
      walkIns,
      revenueThisMonth,
      revenuePrevMonth,
      newPatientsThisMonth,
      newPatientsPrevMonth,
      totalVisitsThisMonth,
      upcomingAppts,
      recentPats,
      lowStock,
      waitingAppts,
      clinicSettings,
    ] = await Promise.all([
      // Today's appointments by status
      Appointment.aggregate([
        { $match: { date: { $gte: todayStart, $lt: todayEnd } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      // Walk-ins today
      Appointment.countDocuments({
        date: { $gte: todayStart, $lt: todayEnd },
        isWalkIn: true,
      }),
      // Revenue this month
      Invoice.aggregate([
        {
          $match: { createdAt: { $gte: monthStart }, status: { $in: ['paid', 'partially_paid'] } },
        },
        { $group: { _id: null, amount: { $sum: '$totalAmount' } } },
      ]),
      // Revenue previous month
      Invoice.aggregate([
        {
          $match: {
            createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd },
            status: { $in: ['paid', 'partially_paid'] },
          },
        },
        { $group: { _id: null, amount: { $sum: '$totalAmount' } } },
      ]),
      // New patients this month
      Patient.countDocuments({ createdAt: { $gte: monthStart } }),
      // New patients prev month
      Patient.countDocuments({ createdAt: { $gte: prevMonthStart, $lte: prevMonthEnd } }),
      // Total visits this month
      Appointment.countDocuments({
        date: { $gte: monthStart },
        status: { $in: ['completed', 'in_progress'] },
      }),
      // Today's upcoming appointments (from start of today, booked/confirmed/arrived)
      Appointment.find({
        date: { $gte: todayStart, $lt: todayEnd },
        status: { $in: ['booked', 'confirmed', 'arrived'] },
      })
        .sort({ date: 1 })
        .limit(5)
        .select('patientId doctorId date serviceType status startTime')
        .populate('patientId', 'firstName lastName')
        .populate('doctorId', 'firstName lastName')
        .lean<Record<string, unknown>[]>(),
      // Recent patients (last 5)
      Patient.find()
        .sort({ updatedAt: -1 })
        .limit(5)
        .select('firstName lastName phone lastVisitDate')
        .lean<Record<string, unknown>[]>(),
      // Low stock alerts — on-hand quantity lives per-branch in inventory_stock,
      // joined to the item catalog for name + reorder level. (InventoryItem has
      // no on-hand quantity field, so the old `$currentQuantity` was undefined.)
      InventoryStock.aggregate([
        {
          $lookup: {
            from: 'inventoryitems',
            localField: 'itemId',
            foreignField: '_id',
            as: 'item',
          },
        },
        { $unwind: '$item' },
        {
          $match: {
            $expr: { $lte: ['$availableQuantity', '$item.reorderLevel'] },
            'item.isActive': true,
          },
        },
        { $sort: { availableQuantity: 1 } },
        { $limit: 10 },
        {
          $project: {
            _id: '$item._id',
            name: { en: '$item.nameEn', ar: '$item.nameAr' },
            currentQuantity: '$availableQuantity',
            reorderLevel: '$item.reorderLevel',
          },
        },
      ]),
      // Waiting room (arrived but not started). The appointment status enum uses
      // `arrived`/`arrivedAt` — there is no `checked_in`/`checkedInAt`.
      Appointment.aggregate([
        {
          $match: {
            date: { $gte: todayStart, $lt: todayEnd },
            status: 'arrived',
          },
        },
        {
          $group: {
            _id: null,
            count: { $sum: 1 },
            avgWait: {
              $avg: {
                $divide: [{ $subtract: [now, '$arrivedAt'] }, 1000 * 60],
              },
            },
          },
        },
      ]),
      // Clinic settings (for currency)
      Settings.findOne({ key: 'clinic' }).lean(),
    ]);

    // Build status map from aggregation
    const statusMap = Object.fromEntries(
      todayAppts.map((a: Record<string, unknown>) => [a._id, a.count]),
    );
    const currRevenue = (revenueThisMonth[0] as Record<string, number>)?.amount || 0;
    const prevRevenue = (revenuePrevMonth[0] as Record<string, number>)?.amount || 0;
    const revenueTrend =
      prevRevenue > 0 ? Math.round(((currRevenue - prevRevenue) / prevRevenue) * 1000) / 10 : 0;
    const patientTrend =
      newPatientsPrevMonth > 0
        ? Math.round(
            ((newPatientsThisMonth - newPatientsPrevMonth) / newPatientsPrevMonth) * 1000,
          ) / 10
        : 0;
    const waitData = waitingAppts[0] as Record<string, number> | undefined;

    const clinicVal = clinicSettings?.value as Record<string, unknown> | undefined;
    const tenantCurrency = (typeof clinicVal?.currency === 'string' && clinicVal.currency) || 'EGP';

    // Name fields can be bilingual { en, ar } objects (e.g. patients) or plain
    // strings (e.g. doctors); normalize both to a display string.
    const enName = (v: unknown): string =>
      v && typeof v === 'object'
        ? ((v as { en?: string; ar?: string }).en ?? (v as { ar?: string }).ar ?? '')
        : typeof v === 'string'
          ? v
          : '';
    return {
      todaysAppointments: {
        booked: statusMap.booked || 0,
        confirmed: statusMap.confirmed || 0,
        completed: statusMap.completed || 0,
        noShow: statusMap.no_show || 0,
        total: Object.values(statusMap as Record<string, number>).reduce(
          (s: number, v: number) => s + v,
          0,
        ),
      },
      walkinsToday: walkIns,
      revenueThisMonth: {
        amount: currRevenue,
        currency: tenantCurrency,
        trend: revenueTrend,
      },
      patientsThisMonth: {
        newPatients: newPatientsThisMonth,
        totalVisits: totalVisitsThisMonth,
        trend: patientTrend,
      },
      upcomingAppointments: upcomingAppts.map((a: Record<string, unknown>) => {
        const patient = a.patientId as Record<string, unknown> | null;
        const doctor = a.doctorId as Record<string, unknown> | null;
        return {
          appointmentId: a._id,
          patientName:
            [enName(patient?.firstName), enName(patient?.lastName)].filter(Boolean).join(' ') ||
            'Unknown Patient',
          doctorName:
            [enName(doctor?.firstName), enName(doctor?.lastName)].filter(Boolean).join(' ') ||
            'Unknown Doctor',
          time: a.startTime || a.date,
          service: a.serviceType,
          status: a.status,
        };
      }),
      recentPatients: recentPats.map((p: Record<string, unknown>) => ({
        patientId: p._id,
        name: [enName(p.firstName), enName(p.lastName)].filter(Boolean).join(' '),
        lastVisit: p.lastVisitDate,
        phone: p.phone,
      })),
      lowStockAlerts: lowStock.map((i: Record<string, unknown>) => ({
        itemId: i._id,
        name: i.name,
        currentQuantity: i.currentQuantity,
        reorderLevel: i.reorderLevel,
      })),
      waitingRoom: {
        count: waitData?.count || 0,
        avgWaitMinutes: Math.round((waitData?.avgWait || 0) * 10) / 10,
      },
    };
  }

  /** Trend comparison data (Free tier) */
  async getTrends(): Promise<DashboardTrends> {
    const Appointment = getAppointmentModel(this.tenantDb);
    const Patient = getPatientModel(this.tenantDb);
    const Invoice = getInvoiceModel(this.tenantDb);

    const now = new Date();
    const currStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const prevStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const prevEnd = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    const [revCurr, revPrev, apptCurr, apptPrev, patCurr, patPrev, nsCurr, nsPrev] =
      await Promise.all([
        Invoice.aggregate([
          {
            $match: { createdAt: { $gte: currStart }, status: { $in: ['paid', 'partially_paid'] } },
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Invoice.aggregate([
          {
            $match: {
              createdAt: { $gte: prevStart, $lte: prevEnd },
              status: { $in: ['paid', 'partially_paid'] },
            },
          },
          { $group: { _id: null, total: { $sum: '$totalAmount' } } },
        ]),
        Appointment.countDocuments({ date: { $gte: currStart } }),
        Appointment.countDocuments({ date: { $gte: prevStart, $lte: prevEnd } }),
        Patient.countDocuments({ createdAt: { $gte: currStart } }),
        Patient.countDocuments({ createdAt: { $gte: prevStart, $lte: prevEnd } }),
        Appointment.countDocuments({ date: { $gte: currStart }, status: 'no_show' }),
        Appointment.countDocuments({ date: { $gte: prevStart, $lte: prevEnd }, status: 'no_show' }),
      ]);

    const pctChange = (curr: number, prev: number) =>
      prev > 0 ? Math.round(((curr - prev) / prev) * 1000) / 10 : 0;

    const rc = (revCurr[0] as Record<string, number>)?.total || 0;
    const rp = (revPrev[0] as Record<string, number>)?.total || 0;

    return {
      revenueComparison: { currentMonth: rc, previousMonth: rp, percentChange: pctChange(rc, rp) },
      appointmentComparison: {
        currentMonth: apptCurr,
        previousMonth: apptPrev,
        percentChange: pctChange(apptCurr, apptPrev),
      },
      patientComparison: {
        currentMonth: patCurr,
        previousMonth: patPrev,
        percentChange: pctChange(patCurr, patPrev),
      },
      noShowComparison: {
        currentMonth: nsCurr,
        previousMonth: nsPrev,
        percentChange: pctChange(nsCurr, nsPrev),
      },
    };
  }
}
