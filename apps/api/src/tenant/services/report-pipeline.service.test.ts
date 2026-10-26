/**
 * ReportPipelineService — Unit Tests
 *
 * Tests all 26 report pipeline methods plus the getReport dispatcher.
 * Each pipeline method returns { summary, chart, table }.
 * Mocks Mongoose aggregate/countDocuments + Redis cache (always miss).
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReportPipelineService } from './report-pipeline.service.js';
import type { Connection } from 'mongoose';

// ── Mock Factory Helpers ───────────────────────────────────

function createAggregateMock(result: unknown[] = []) {
  return vi.fn().mockResolvedValue(result);
}

function createMockModel(aggregateResult: unknown[] = []) {
  return {
    find: vi.fn().mockReturnValue({
      sort: vi.fn().mockReturnValue({
        skip: vi.fn().mockReturnValue({
          limit: vi.fn().mockReturnValue({
            populate: vi.fn().mockReturnValue({
              lean: vi.fn().mockResolvedValue([]),
            }),
            lean: vi.fn().mockResolvedValue([]),
          }),
        }),
      }),
      lean: vi.fn().mockResolvedValue([]),
    }),
    findById: vi.fn().mockReturnValue({
      lean: vi.fn().mockResolvedValue(null),
    }),
    countDocuments: vi.fn().mockResolvedValue(100),
    aggregate: createAggregateMock(aggregateResult),
  };
}

// ── Mock Redis (always miss — no cache) ────────────────────

vi.mock('../../config/redis.js', () => ({
  getRedis: vi.fn(() => ({
    get: vi.fn().mockResolvedValue(null),
    setex: vi.fn().mockResolvedValue('OK'),
  })),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

// ── Model-level aggregate mocks ────────────────────────────

let invoiceAggregate: ReturnType<typeof vi.fn>;
let paymentAggregate: ReturnType<typeof vi.fn>;
let commissionAggregate: ReturnType<typeof vi.fn>;
let reconciliationAggregate: ReturnType<typeof vi.fn>;
let patientAggregate: ReturnType<typeof vi.fn>;
let appointmentAggregate: ReturnType<typeof vi.fn>;
let appointmentCountDocs: ReturnType<typeof vi.fn>;
let doctorScheduleAggregate: ReturnType<typeof vi.fn>;
let procedureNoteAggregate: ReturnType<typeof vi.fn>;
let treatmentPlanAggregate: ReturnType<typeof vi.fn>;
let labOrderAggregate: ReturnType<typeof vi.fn>;
let prescriptionAggregate: ReturnType<typeof vi.fn>;

vi.mock('../models/invoice.model.js', () => ({
  getInvoiceModel: vi.fn(() => {
    const model = createMockModel();
    invoiceAggregate = model.aggregate;
    return model;
  }),
}));

vi.mock('../models/payment.model.js', () => ({
  getTenantPaymentModel: vi.fn(() => {
    const model = createMockModel();
    paymentAggregate = model.aggregate;
    return model;
  }),
}));

vi.mock('../models/doctor-commission.model.js', () => ({
  getDoctorCommissionModel: vi.fn(() => {
    const model = createMockModel();
    commissionAggregate = model.aggregate;
    return model;
  }),
}));

vi.mock('../models/reconciliation.model.js', () => ({
  getReconciliationModel: vi.fn(() => {
    const model = createMockModel();
    reconciliationAggregate = model.aggregate;
    return model;
  }),
}));

vi.mock('../models/patient.model.js', () => ({
  getPatientModel: vi.fn(() => {
    const model = createMockModel();
    patientAggregate = model.aggregate;
    return model;
  }),
}));

vi.mock('../models/appointment.model.js', () => ({
  getAppointmentModel: vi.fn(() => {
    const model = createMockModel();
    appointmentAggregate = model.aggregate;
    appointmentCountDocs = model.countDocuments;
    return model;
  }),
}));

vi.mock('../models/doctor-schedule.model.js', () => ({
  getDoctorScheduleModel: vi.fn(() => {
    const model = createMockModel();
    doctorScheduleAggregate = model.aggregate;
    return model;
  }),
}));

vi.mock('../models/procedure-note.model.js', () => ({
  getProcedureNoteModel: vi.fn(() => {
    const model = createMockModel();
    procedureNoteAggregate = model.aggregate;
    return model;
  }),
}));

vi.mock('../models/treatment-plan.model.js', () => ({
  getTreatmentPlanModel: vi.fn(() => {
    const model = createMockModel();
    treatmentPlanAggregate = model.aggregate;
    return model;
  }),
}));

vi.mock('../models/lab-order.model.js', () => ({
  getLabOrderModel: vi.fn(() => {
    const model = createMockModel();
    labOrderAggregate = model.aggregate;
    return model;
  }),
}));

vi.mock('../models/prescription.model.js', () => ({
  getPrescriptionModel: vi.fn(() => {
    const model = createMockModel();
    prescriptionAggregate = model.aggregate;
    return model;
  }),
}));

// ── Fixture Data ───────────────────────────────────────────

const revenueChartData = [
  { _id: { year: 2025, month: 1 }, revenue: 50000, invoiceCount: 40, avgInvoice: 1250 },
];
const revenueSummaryData = [
  {
    _id: null,
    totalRevenue: 50000,
    invoiceCount: 40,
    avgInvoice: 1250,
    maxInvoice: 5000,
    minInvoice: 100,
  },
];

const revenueByDoctorData = [
  { _id: 'doc-1', totalRevenue: 30000, invoiceCount: 25, avgInvoice: 1200 },
  { _id: 'doc-2', totalRevenue: 20000, invoiceCount: 15, avgInvoice: 1333 },
];

const revenueByServiceData = [
  {
    _id: { serviceId: 'svc-1', description: 'Filling' },
    totalRevenue: 15000,
    quantity: 20,
    avgPrice: 750,
  },
];

const revenueByBranchData = [
  { _id: 'branch-1', totalRevenue: 30000, invoiceCount: 20, avgInvoice: 1500 },
];

const paymentCollectionData = [
  { _id: 'credit_card', totalAmount: 25000, count: 30 },
  { _id: 'cash', totalAmount: 15000, count: 20 },
];

const outstandingAgingData = [
  {
    _id: 0,
    count: 5,
    totalBalance: 10000,
    invoices: [{ invoiceNumber: 'INV-001', balanceDue: 2000 }],
  },
  { _id: 31, count: 3, totalBalance: 8000, invoices: [] },
];

const taxData = [
  {
    _id: { year: 2025, month: 1 },
    totalTax: 2500,
    subtotal: 50000,
    invoiceCount: 40,
    taxableRevenue: 48000,
  },
];

const commissionData = [
  {
    _id: 'doc-1',
    totalCommissions: 10,
    totalAmount: 5000,
    totalProcedureAmount: 30000,
    pending: 1000,
    approved: 2000,
    paid: 2000,
    avgRate: 15,
  },
];

const reconciliationData = [
  {
    _id: { date: new Date('2025-01-15'), branchId: 'b1' },
    expectedAmount: 5000,
    actualAmount: 4800,
    difference: -200,
    transactionCount: 15,
  },
];

const patientOverviewFacet = [
  {
    total: [{ count: 500 }],
    active: [{ count: 450 }],
    inactive: [{ count: 50 }],
    newThisMonth: [{ count: 20 }],
  },
];
const patientTrend = [{ _id: { year: 2025, month: 1 }, count: 20 }];

const newVsReturningData = [
  { _id: { year: 2025, month: 1 }, newPatients: 10, returningPatients: 30, total: 40 },
];

const genderData = [
  { _id: 'male', count: 250 },
  { _id: 'female', count: 200 },
];
const ageBucketData = [
  { _id: 0, count: 50 },
  { _id: 18, count: 200 },
];
const nationalityData = [{ _id: 'SA', count: 300 }];

const noShowByDoctor = [{ _id: 'doc-1', count: 5 }];
const noShowByDay = [{ _id: 1, count: 3 }];
const noShowByHour = [{ _id: 9, count: 2 }];

const referralData = [
  { _id: 'google', count: 100 },
  { _id: 'referral', count: 50 },
];

const appointmentStatusData = [
  { _id: 'completed', count: 200 },
  { _id: 'cancelled', count: 30 },
  { _id: 'no_show', count: 10 },
];

const doctorUtilBooked = [{ _id: 'doc-1', booked: 80 }];
const doctorUtilSchedule = [{ _id: 'doc-1', totalSlots: 100 }];

const chairUtilData = [{ _id: 'chair-1', totalAppointments: 50, totalMinutes: 1500 }];

const cancellationByReason = [{ _id: 'Patient Request', count: 15 }];
const cancellationTrend = [{ _id: { year: 2025, week: 5 }, count: 3 }];

const peakHoursData = [{ _id: { dayOfWeek: 2, hour: 10 }, count: 15 }];

const durationByService = [
  { _id: 'cleaning', avgDuration: 30, minDuration: 20, maxDuration: 45, count: 50 },
];
const durationByDoctor = [{ _id: 'doc-1', avgDuration: 35, count: 60 }];

const proceduresByType = [{ _id: 'PROC-001', name: 'Root Canal', count: 25, totalFee: 50000 }];
const proceduresByDoctor = [{ _id: 'doc-1', noteCount: 40, procedureCount: 80 }];

const treatmentPlanData = [
  { _id: 'accepted', count: 50, totalEstimate: 500000 },
  { _id: 'completed', count: 30, totalEstimate: 300000 },
  { _id: 'proposed', count: 20, totalEstimate: 200000 },
];

const labOrderData = [
  { _id: 'lab-1', avgTurnaround: 48, minTurnaround: 24, maxTurnaround: 72, orderCount: 10 },
];

const prescriptionByMed = [{ _id: 'med-1', name: 'Amoxicillin', count: 50, totalQuantity: 500 }];
const prescriptionByDoctor = [{ _id: 'doc-1', prescriptionCount: 30, medicationCount: 60 }];
const prescriptionTrend = [{ _id: { year: 2025, month: 1 }, count: 30 }];

const waitTimeByBranch = [{ _id: 'branch-1', avgWait: 12, maxWait: 30, count: 50 }];
const waitTimeByDoctor = [{ _id: 'doc-1', avgWait: 10, maxWait: 25, count: 40 }];

const productivityAppts = [
  {
    _id: 'doc-1',
    appointments: 80,
    workDays: ['2025-01-01', '2025-01-02'],
    uniqueWorkDays: 2,
    apptPerDay: 40,
  },
];
const productivityRevenue = [{ _id: 'doc-1', totalRevenue: 100000, invoiceCount: 80 }];

// ── Tests ──────────────────────────────────────────────────

describe('ReportPipelineService', () => {
  let service: ReportPipelineService;
  const mockConnection = {} as Connection;
  const filters = { from: '2025-01-01', to: '2025-06-30' };

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ReportPipelineService(mockConnection, 'tenant-1');
  });

  // ══════════════════════════════════════════════════════════
  // FINANCIAL PIPELINES (F1–F7, O1–O2)
  // ══════════════════════════════════════════════════════════

  describe('F1: revenueByPeriod', () => {
    it('should return summary, chart, and table', async () => {
      invoiceAggregate
        .mockResolvedValueOnce(revenueChartData)
        .mockResolvedValueOnce(revenueSummaryData);

      const result = await service.revenueByPeriod(filters);

      expect(result).toBeDefined();
      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('table');
      expect(result.summary.totalRevenue).toBe(50000);
      expect(result.summary.invoiceCount).toBe(40);
      expect(invoiceAggregate).toHaveBeenCalledTimes(2);
    });

    it('should handle empty data', async () => {
      invoiceAggregate.mockResolvedValueOnce([]).mockResolvedValueOnce([]);

      const result = await service.revenueByPeriod(filters);

      expect(result.summary.totalRevenue).toBe(0);
      expect(result.chart).toHaveLength(0);
    });
  });

  describe('F2: revenueByDoctor', () => {
    it('should return summary, chart, and table', async () => {
      invoiceAggregate.mockResolvedValueOnce(revenueByDoctorData);

      const result = await service.revenueByDoctor(filters);

      expect(result).toHaveProperty('summary');
      expect(result).toHaveProperty('chart');
      expect(result).toHaveProperty('table');
      expect(result.summary.totalRevenue).toBe(50000);
      expect(result.summary.doctorCount).toBe(2);
    });

    it('should calculate revenue share percentages', async () => {
      invoiceAggregate.mockResolvedValueOnce(revenueByDoctorData);

      const result = await service.revenueByDoctor(filters);

      expect(result.chart[0].share).toBeGreaterThan(0);
      expect(result.chart[0].share).toBeLessThanOrEqual(100);
    });
  });

  describe('F3: revenueByService', () => {
    it('should return summary, chart, and table', async () => {
      invoiceAggregate.mockResolvedValueOnce(revenueByServiceData);

      const result = await service.revenueByService(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.serviceCount).toBe(1);
      expect(result.chart).toHaveLength(1);
    });
  });

  describe('F4: revenueByBranch', () => {
    it('should return summary, chart, and table', async () => {
      invoiceAggregate.mockResolvedValueOnce(revenueByBranchData);

      const result = await service.revenueByBranch(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.branchCount).toBe(1);
      expect(result.chart).toHaveLength(1);
    });
  });

  describe('F5: paymentCollection', () => {
    it('should return summary, chart, and table', async () => {
      paymentAggregate.mockResolvedValueOnce(paymentCollectionData);

      const result = await service.paymentCollection(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.totalCollected).toBe(40000);
      expect(result.summary.transactionCount).toBe(50);
      expect(result.chart).toHaveLength(2);
    });
  });

  describe('F6: outstandingAging', () => {
    it('should return aging buckets', async () => {
      invoiceAggregate.mockResolvedValueOnce(outstandingAgingData);

      const result = await service.outstandingAging(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.totalOutstanding).toBe(18000);
      expect(result.chart).toHaveLength(2);
    });
  });

  describe('F7: taxReport', () => {
    it('should return tax summary with effective rate', async () => {
      invoiceAggregate.mockResolvedValueOnce(taxData);

      const result = await service.taxReport(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.totalTax).toBe(2500);
      expect(result.summary.effectiveRate).toBeGreaterThan(0);
    });
  });

  describe('O1: commissionSummary', () => {
    it('should return commission data', async () => {
      commissionAggregate.mockResolvedValueOnce(commissionData);

      const result = await service.commissionSummary(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.totalCommissionAmount).toBe(5000);
      expect(result.summary.doctorCount).toBe(1);
    });
  });

  describe('O2: dailyReconciliation', () => {
    it('should return reconciliation data', async () => {
      reconciliationAggregate.mockResolvedValueOnce(reconciliationData);

      const result = await service.dailyReconciliation(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.totalExpected).toBe(5000);
      expect(result.summary.totalActual).toBe(4800);
      expect(result.summary.matchRate).toBeLessThanOrEqual(100);
    });
  });

  // ══════════════════════════════════════════════════════════
  // PATIENT PIPELINES (P1–P5)
  // ══════════════════════════════════════════════════════════

  describe('P1: patientOverview', () => {
    it('should return patient overview stats', async () => {
      patientAggregate
        .mockResolvedValueOnce(patientOverviewFacet)
        .mockResolvedValueOnce(patientTrend);

      const result = await service.patientOverview(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.totalPatients).toBe(500);
      expect(result.summary.active).toBe(450);
      expect(result.chart).toHaveLength(1);
    });
  });

  describe('P2: newVsReturning', () => {
    it('should return new vs returning breakdown', async () => {
      appointmentAggregate.mockResolvedValueOnce(newVsReturningData);

      const result = await service.newVsReturning(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.newPatients).toBe(10);
      expect(result.summary.returningPatients).toBe(30);
      expect(result.summary.newRate).toBeGreaterThan(0);
    });
  });

  describe('P3: patientDemographics', () => {
    it('should return demographics data', async () => {
      patientAggregate
        .mockResolvedValueOnce(genderData)
        .mockResolvedValueOnce(ageBucketData)
        .mockResolvedValueOnce(nationalityData);

      const result = await service.patientDemographics(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.totalPatients).toBe(450);
      expect(result.chart).toHaveLength(2);
    });
  });

  describe('P4: noShowReport', () => {
    it('should return no-show analysis', async () => {
      appointmentAggregate
        .mockResolvedValueOnce(noShowByDoctor)
        .mockResolvedValueOnce(noShowByDay)
        .mockResolvedValueOnce(noShowByHour);
      appointmentCountDocs.mockResolvedValueOnce(200);

      const result = await service.noShowReport(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.totalNoShows).toBe(5);
      expect(result.summary.totalAppointments).toBe(200);
      expect(result.summary.noShowRate).toBeGreaterThan(0);
    });
  });

  describe('P5: patientSourceReferral', () => {
    it('should return referral source analysis', async () => {
      patientAggregate.mockResolvedValueOnce(referralData);

      const result = await service.patientSourceReferral(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.totalPatients).toBe(150);
      expect(result.summary.sourceCount).toBe(2);
      expect(result.chart).toHaveLength(2);
    });
  });

  // ══════════════════════════════════════════════════════════
  // APPOINTMENT PIPELINES (A1–A6)
  // ══════════════════════════════════════════════════════════

  describe('A1: appointmentSummary', () => {
    it('should return appointment status breakdown', async () => {
      appointmentAggregate.mockResolvedValueOnce(appointmentStatusData);

      const result = await service.appointmentSummary(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.total).toBe(240);
      expect(result.chart).toHaveLength(3);
    });
  });

  describe('A2: doctorUtilization', () => {
    it('should return utilization rates', async () => {
      appointmentAggregate.mockResolvedValueOnce(doctorUtilBooked);
      doctorScheduleAggregate.mockResolvedValueOnce(doctorUtilSchedule);

      const result = await service.doctorUtilization(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.doctorCount).toBe(1);
      expect(result.summary.avgUtilization).toBeGreaterThan(0);
      expect(result.chart[0].utilization).toBe(80);
    });
  });

  describe('A3: chairUtilization', () => {
    it('should return chair usage metrics', async () => {
      appointmentAggregate.mockResolvedValueOnce(chairUtilData);

      const result = await service.chairUtilization(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.chairCount).toBe(1);
      expect(result.summary.totalAppointments).toBe(50);
    });
  });

  describe('A4: cancellationAnalysis', () => {
    it('should return cancellation data', async () => {
      appointmentAggregate
        .mockResolvedValueOnce(cancellationByReason)
        .mockResolvedValueOnce(cancellationTrend);
      appointmentCountDocs.mockResolvedValueOnce(300);

      const result = await service.cancellationAnalysis(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.totalCancelled).toBe(15);
      expect(result.summary.cancellationRate).toBeGreaterThan(0);
    });
  });

  describe('A5: peakHoursHeatmap', () => {
    it('should return heatmap matrix', async () => {
      appointmentAggregate.mockResolvedValueOnce(peakHoursData);

      const result = await service.peakHoursHeatmap(filters);

      expect(result).toHaveProperty('summary');
      expect(result.chart).toHaveLength(7); // 7 days
      expect(result.chart[0]).toHaveLength(24); // 24 hours
    });
  });

  describe('A6: avgDurationAnalysis', () => {
    it('should return duration analysis', async () => {
      appointmentAggregate
        .mockResolvedValueOnce(durationByService)
        .mockResolvedValueOnce(durationByDoctor);

      const result = await service.avgDurationAnalysis(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.avgDuration).toBeGreaterThan(0);
      expect(result.chart).toHaveLength(1);
      expect(result.table).toHaveLength(1);
    });
  });

  // ══════════════════════════════════════════════════════════
  // CLINICAL PIPELINES (C1–C4)
  // ══════════════════════════════════════════════════════════

  describe('C1: proceduresPerformed', () => {
    it('should return procedure stats', async () => {
      procedureNoteAggregate
        .mockResolvedValueOnce(proceduresByType)
        .mockResolvedValueOnce(proceduresByDoctor);

      const result = await service.proceduresPerformed(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.totalProcedures).toBe(25);
      expect(result.summary.totalRevenue).toBe(50000);
    });
  });

  describe('C2: treatmentPlanAcceptance', () => {
    it('should return treatment plan acceptance rates', async () => {
      treatmentPlanAggregate.mockResolvedValueOnce(treatmentPlanData);

      const result = await service.treatmentPlanAcceptance(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.totalPlans).toBe(100);
      expect(result.summary.accepted).toBe(50);
      expect(result.summary.completed).toBe(30);
      expect(result.summary.acceptanceRate).toBe(80);
    });
  });

  describe('C3: labOrderTurnaround', () => {
    it('should return lab turnaround times', async () => {
      labOrderAggregate.mockResolvedValueOnce(labOrderData);

      const result = await service.labOrderTurnaround(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.avgTurnaroundHours).toBe(48);
      expect(result.summary.labCount).toBe(1);
      expect(result.summary.totalOrders).toBe(10);
    });
  });

  describe('C4: prescriptionVolume', () => {
    it('should return prescription volume data', async () => {
      prescriptionAggregate
        .mockResolvedValueOnce(prescriptionByMed)
        .mockResolvedValueOnce(prescriptionByDoctor)
        .mockResolvedValueOnce(prescriptionTrend);

      const result = await service.prescriptionVolume(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.totalPrescriptions).toBe(30);
      expect(result.summary.uniqueMedications).toBe(1);
    });
  });

  // ══════════════════════════════════════════════════════════
  // OPERATIONAL PIPELINES (O3–O4)
  // ══════════════════════════════════════════════════════════

  describe('O3: waitTimeAnalysis', () => {
    it('should return wait time metrics', async () => {
      appointmentAggregate
        .mockResolvedValueOnce(waitTimeByBranch)
        .mockResolvedValueOnce(waitTimeByDoctor);

      const result = await service.waitTimeAnalysis(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.avgWaitMinutes).toBe(12);
      expect(result.summary.totalAppointments).toBe(50);
    });
  });

  describe('O4: staffProductivity', () => {
    it('should return staff productivity metrics', async () => {
      appointmentAggregate.mockResolvedValueOnce(productivityAppts);
      invoiceAggregate.mockResolvedValueOnce(productivityRevenue);

      const result = await service.staffProductivity(filters);

      expect(result).toHaveProperty('summary');
      expect(result.summary.doctorCount).toBe(1);
      expect(result.summary.totalAppointments).toBe(80);
      expect(result.summary.totalRevenue).toBe(100000);
    });
  });

  // ══════════════════════════════════════════════════════════
  // DISPATCHER
  // ══════════════════════════════════════════════════════════

  describe('getReport dispatcher', () => {
    it('should dispatch revenue_summary to revenueByPeriod', async () => {
      invoiceAggregate
        .mockResolvedValueOnce(revenueChartData)
        .mockResolvedValueOnce(revenueSummaryData);

      const result = await service.getReport('revenue_summary', filters);
      expect(result).toBeDefined();
      expect(result).toHaveProperty('summary');
    });

    it('should dispatch revenue_by_doctor', async () => {
      invoiceAggregate.mockResolvedValueOnce(revenueByDoctorData);
      const result = await service.getReport('revenue_by_doctor', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch revenue_by_service', async () => {
      invoiceAggregate.mockResolvedValueOnce(revenueByServiceData);
      const result = await service.getReport('revenue_by_service', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch revenue_by_branch', async () => {
      invoiceAggregate.mockResolvedValueOnce(revenueByBranchData);
      const result = await service.getReport('revenue_by_branch', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch payment_collection', async () => {
      paymentAggregate.mockResolvedValueOnce(paymentCollectionData);
      const result = await service.getReport('payment_collection', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch outstanding_aging', async () => {
      invoiceAggregate.mockResolvedValueOnce(outstandingAgingData);
      const result = await service.getReport('outstanding_aging', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch tax_report', async () => {
      invoiceAggregate.mockResolvedValueOnce(taxData);
      const result = await service.getReport('tax_report', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch commission_summary', async () => {
      commissionAggregate.mockResolvedValueOnce(commissionData);
      const result = await service.getReport('commission_summary', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch daily_reconciliation', async () => {
      reconciliationAggregate.mockResolvedValueOnce(reconciliationData);
      const result = await service.getReport('daily_reconciliation', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch patient_overview', async () => {
      patientAggregate
        .mockResolvedValueOnce(patientOverviewFacet)
        .mockResolvedValueOnce(patientTrend);
      const result = await service.getReport('patient_overview', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch new_vs_returning', async () => {
      appointmentAggregate.mockResolvedValueOnce(newVsReturningData);
      const result = await service.getReport('new_vs_returning', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch demographics', async () => {
      patientAggregate
        .mockResolvedValueOnce(genderData)
        .mockResolvedValueOnce(ageBucketData)
        .mockResolvedValueOnce(nationalityData);
      const result = await service.getReport('demographics', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch no_show', async () => {
      appointmentAggregate
        .mockResolvedValueOnce(noShowByDoctor)
        .mockResolvedValueOnce(noShowByDay)
        .mockResolvedValueOnce(noShowByHour);
      appointmentCountDocs.mockResolvedValueOnce(200);
      const result = await service.getReport('no_show', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch source_referral', async () => {
      patientAggregate.mockResolvedValueOnce(referralData);
      const result = await service.getReport('source_referral', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch summary (appointment)', async () => {
      appointmentAggregate.mockResolvedValueOnce(appointmentStatusData);
      const result = await service.getReport('summary', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch doctor_utilization', async () => {
      appointmentAggregate.mockResolvedValueOnce(doctorUtilBooked);
      doctorScheduleAggregate.mockResolvedValueOnce(doctorUtilSchedule);
      const result = await service.getReport('doctor_utilization', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch chair_utilization', async () => {
      appointmentAggregate.mockResolvedValueOnce(chairUtilData);
      const result = await service.getReport('chair_utilization', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch cancellation_analysis', async () => {
      appointmentAggregate
        .mockResolvedValueOnce(cancellationByReason)
        .mockResolvedValueOnce(cancellationTrend);
      appointmentCountDocs.mockResolvedValueOnce(300);
      const result = await service.getReport('cancellation_analysis', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch peak_hours', async () => {
      appointmentAggregate.mockResolvedValueOnce(peakHoursData);
      const result = await service.getReport('peak_hours', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch avg_duration', async () => {
      appointmentAggregate
        .mockResolvedValueOnce(durationByService)
        .mockResolvedValueOnce(durationByDoctor);
      const result = await service.getReport('avg_duration', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch procedures_performed', async () => {
      procedureNoteAggregate
        .mockResolvedValueOnce(proceduresByType)
        .mockResolvedValueOnce(proceduresByDoctor);
      const result = await service.getReport('procedures_performed', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch treatment_plan_acceptance', async () => {
      treatmentPlanAggregate.mockResolvedValueOnce(treatmentPlanData);
      const result = await service.getReport('treatment_plan_acceptance', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch lab_order_turnaround', async () => {
      labOrderAggregate.mockResolvedValueOnce(labOrderData);
      const result = await service.getReport('lab_order_turnaround', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch prescription_volume', async () => {
      prescriptionAggregate
        .mockResolvedValueOnce(prescriptionByMed)
        .mockResolvedValueOnce(prescriptionByDoctor)
        .mockResolvedValueOnce(prescriptionTrend);
      const result = await service.getReport('prescription_volume', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch wait_time_analysis', async () => {
      appointmentAggregate
        .mockResolvedValueOnce(waitTimeByBranch)
        .mockResolvedValueOnce(waitTimeByDoctor);
      const result = await service.getReport('wait_time_analysis', filters);
      expect(result).toBeDefined();
    });

    it('should dispatch staff_productivity', async () => {
      appointmentAggregate.mockResolvedValueOnce(productivityAppts);
      invoiceAggregate.mockResolvedValueOnce(productivityRevenue);
      const result = await service.getReport('staff_productivity', filters);
      expect(result).toBeDefined();
    });

    it('should return null for unknown report type', async () => {
      const result = await service.getReport('nonexistent_report', filters);
      expect(result).toBeNull();
    });
  });
});
