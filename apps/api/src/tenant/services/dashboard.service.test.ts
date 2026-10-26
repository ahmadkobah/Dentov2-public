/**
 * DashboardService — Unit Tests
 *
 * Tests getStats() and getTrends() methods which aggregate data
 * from Appointment, Patient, Invoice and InventoryStock models.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DashboardService } from './dashboard.service.js';
import type { Connection } from 'mongoose';

// ── Mock Factory Helpers ───────────────────────────────────

function chainable(result: unknown = []) {
  const chain: Record<string, ReturnType<typeof vi.fn>> = {};
  chain.sort = vi.fn().mockReturnValue(chain);
  chain.skip = vi.fn().mockReturnValue(chain);
  chain.limit = vi.fn().mockReturnValue(chain);
  chain.select = vi.fn().mockReturnValue(chain);
  chain.populate = vi.fn().mockReturnValue(chain);
  chain.lean = vi.fn().mockResolvedValue(result);
  return chain;
}

function createMockModel(aggregateResult: unknown[] = []) {
  return {
    find: vi.fn().mockReturnValue(chainable([])),
    countDocuments: vi.fn().mockResolvedValue(0),
    aggregate: vi.fn().mockResolvedValue(aggregateResult),
  };
}

// ── Model-Level Mocks ──────────────────────────────────────

let appointmentModel: ReturnType<typeof createMockModel>;
let patientModel: ReturnType<typeof createMockModel>;
let invoiceModel: ReturnType<typeof createMockModel>;
let inventoryStockModel: ReturnType<typeof createMockModel>;

vi.mock('../models/appointment.model.js', () => ({
  getAppointmentModel: vi.fn(() => appointmentModel),
}));

vi.mock('../models/patient.model.js', () => ({
  getPatientModel: vi.fn(() => patientModel),
}));

vi.mock('../models/doctor.model.js', () => ({
  getDoctorModel: vi.fn(() => ({})),
}));

vi.mock('../models/invoice.model.js', () => ({
  getInvoiceModel: vi.fn(() => invoiceModel),
}));

vi.mock('../models/inventory-stock.model.js', () => ({
  getInventoryStockModel: vi.fn(() => inventoryStockModel),
}));

vi.mock('../models/settings.model.js', () => ({
  getSettingsModel: vi.fn(() => ({
    findOne: vi.fn().mockReturnValue({ lean: vi.fn().mockResolvedValue(null) }),
  })),
}));

// ── Setup ──────────────────────────────────────────────────

const fakeConn = {} as Connection;
let service: DashboardService;

beforeEach(() => {
  vi.clearAllMocks();
  appointmentModel = createMockModel();
  patientModel = createMockModel();
  invoiceModel = createMockModel();
  inventoryStockModel = createMockModel();
  service = new DashboardService(fakeConn);
});

// ── getStats ───────────────────────────────────────────────

describe('DashboardService.getStats', () => {
  it('should return zeroed stats when database is empty', async () => {
    // All mocks default to empty arrays / 0 counts
    const stats = await service.getStats();

    expect(stats.todaysAppointments).toEqual({
      booked: 0,
      confirmed: 0,
      completed: 0,
      noShow: 0,
      total: 0,
    });
    expect(stats.walkinsToday).toBe(0);
    expect(stats.revenueThisMonth).toEqual({ amount: 0, currency: 'EGP', trend: 0 });
    expect(stats.patientsThisMonth).toEqual({ newPatients: 0, totalVisits: 0, trend: 0 });
    expect(stats.upcomingAppointments).toEqual([]);
    expect(stats.recentPatients).toEqual([]);
    expect(stats.lowStockAlerts).toEqual([]);
    expect(stats.waitingRoom).toEqual({ count: 0, avgWaitMinutes: 0 });
  });

  it('should aggregate todays appointments by status', async () => {
    appointmentModel.aggregate = vi
      .fn()
      // 1st call: todays appts by status
      .mockResolvedValueOnce([
        { _id: 'booked', count: 3 },
        { _id: 'confirmed', count: 2 },
        { _id: 'completed', count: 5 },
        { _id: 'no_show', count: 1 },
      ])
      // 4th call (waiting room) — aggregate is called once more for waiting room
      .mockResolvedValue([]);

    const stats = await service.getStats();

    expect(stats.todaysAppointments).toEqual({
      booked: 3,
      confirmed: 2,
      completed: 5,
      noShow: 1,
      total: 11,
    });
  });

  it('should calculate revenue trend correctly', async () => {
    // Default appointment aggregate returns empty
    appointmentModel.aggregate = vi.fn().mockResolvedValue([]);

    // Invoice aggregate: this month then prev month
    invoiceModel.aggregate = vi
      .fn()
      .mockResolvedValueOnce([{ _id: null, amount: 10000 }]) // this month
      .mockResolvedValueOnce([{ _id: null, amount: 8000 }]); // prev month

    const stats = await service.getStats();

    // (10000-8000)/8000 * 100 = 25.0
    expect(stats.revenueThisMonth.amount).toBe(10000);
    expect(stats.revenueThisMonth.trend).toBe(25);
  });

  it('should calculate patient trend correctly', async () => {
    appointmentModel.aggregate = vi.fn().mockResolvedValue([]);
    invoiceModel.aggregate = vi.fn().mockResolvedValue([]);

    patientModel.countDocuments = vi
      .fn()
      .mockResolvedValueOnce(20) // new patients this month
      .mockResolvedValueOnce(10); // new patients prev month

    const stats = await service.getStats();

    expect(stats.patientsThisMonth.newPatients).toBe(20);
    // (20-10)/10 * 100 = 100.0
    expect(stats.patientsThisMonth.trend).toBe(100);
  });

  it('should map upcoming appointments correctly', async () => {
    appointmentModel.aggregate = vi.fn().mockResolvedValue([]);
    const upcomingData = [
      {
        _id: 'appt-1',
        patientId: 'pat-1',
        doctorId: 'doc-1',
        date: new Date('2025-06-01T10:00:00Z'),
        serviceType: 'Cleaning',
        status: 'booked',
      },
    ];
    appointmentModel.find = vi.fn().mockReturnValue(chainable(upcomingData));

    const stats = await service.getStats();

    expect(stats.upcomingAppointments).toHaveLength(1);
    expect(stats.upcomingAppointments[0]).toEqual({
      appointmentId: 'appt-1',
      patientName: 'Unknown Patient',
      doctorName: 'Unknown Doctor',
      time: upcomingData[0].date,
      service: 'Cleaning',
      status: 'booked',
    });
  });

  it('should map recent patients with full name', async () => {
    appointmentModel.aggregate = vi.fn().mockResolvedValue([]);
    const patientData = [
      {
        _id: 'pat-1',
        firstName: 'Ahmad',
        lastName: 'Hassan',
        phone: '+201234567890',
        lastVisitDate: new Date('2025-05-15'),
      },
    ];
    patientModel.find = vi.fn().mockReturnValue(chainable(patientData));

    const stats = await service.getStats();

    expect(stats.recentPatients).toHaveLength(1);
    expect(stats.recentPatients[0]).toEqual({
      patientId: 'pat-1',
      name: 'Ahmad Hassan',
      lastVisit: patientData[0].lastVisitDate,
      phone: '+201234567890',
    });
  });

  it('should map low stock alerts', async () => {
    appointmentModel.aggregate = vi.fn().mockResolvedValue([]);
    // Low-stock is an aggregation on inventory_stock joined to the item catalog;
    // the projection yields the item id, name, on-hand qty and reorder level.
    const stockData = [
      { _id: 'item-1', name: { en: 'Gloves', ar: '' }, currentQuantity: 5, reorderLevel: 20 },
    ];
    inventoryStockModel.aggregate = vi.fn().mockResolvedValue(stockData);

    const stats = await service.getStats();

    expect(stats.lowStockAlerts).toHaveLength(1);
    expect(stats.lowStockAlerts[0]).toEqual({
      itemId: 'item-1',
      name: { en: 'Gloves', ar: '' },
      currentQuantity: 5,
      reorderLevel: 20,
    });
  });

  it('should compute waiting room stats', async () => {
    appointmentModel.aggregate = vi
      .fn()
      .mockResolvedValueOnce([]) // todays appts by status
      .mockResolvedValueOnce([{ _id: null, count: 3, avgWait: 12.5 }]); // waiting room

    const stats = await service.getStats();

    expect(stats.waitingRoom).toEqual({ count: 3, avgWaitMinutes: 12.5 });
  });

  it('should handle revenue trend as 0 when previous month is 0', async () => {
    appointmentModel.aggregate = vi.fn().mockResolvedValue([]);
    invoiceModel.aggregate = vi
      .fn()
      .mockResolvedValueOnce([{ _id: null, amount: 5000 }]) // this month
      .mockResolvedValueOnce([]); // prev month empty

    const stats = await service.getStats();

    expect(stats.revenueThisMonth.amount).toBe(5000);
    expect(stats.revenueThisMonth.trend).toBe(0);
  });
});

// ── getTrends ──────────────────────────────────────────────

describe('DashboardService.getTrends', () => {
  it('should return zeroed trends when database is empty', async () => {
    const trends = await service.getTrends();

    expect(trends.revenueComparison).toEqual({
      currentMonth: 0,
      previousMonth: 0,
      percentChange: 0,
    });
    expect(trends.appointmentComparison).toEqual({
      currentMonth: 0,
      previousMonth: 0,
      percentChange: 0,
    });
    expect(trends.patientComparison).toEqual({
      currentMonth: 0,
      previousMonth: 0,
      percentChange: 0,
    });
    expect(trends.noShowComparison).toEqual({
      currentMonth: 0,
      previousMonth: 0,
      percentChange: 0,
    });
  });

  it('should calculate revenue comparison correctly', async () => {
    invoiceModel.aggregate = vi
      .fn()
      .mockResolvedValueOnce([{ _id: null, total: 15000 }]) // current month
      .mockResolvedValueOnce([{ _id: null, total: 12000 }]); // previous month

    const trends = await service.getTrends();

    expect(trends.revenueComparison.currentMonth).toBe(15000);
    expect(trends.revenueComparison.previousMonth).toBe(12000);
    // (15000-12000)/12000 * 100 = 25.0
    expect(trends.revenueComparison.percentChange).toBe(25);
  });

  it('should calculate appointment and patient comparisons', async () => {
    invoiceModel.aggregate = vi.fn().mockResolvedValue([]);

    appointmentModel.countDocuments = vi
      .fn()
      .mockResolvedValueOnce(50) // current month appointments
      .mockResolvedValueOnce(40) // previous month appointments
      .mockResolvedValueOnce(5) // current month no-shows
      .mockResolvedValueOnce(10); // previous month no-shows

    patientModel.countDocuments = vi
      .fn()
      .mockResolvedValueOnce(30) // current month patients
      .mockResolvedValueOnce(20); // previous month patients

    const trends = await service.getTrends();

    expect(trends.appointmentComparison).toEqual({
      currentMonth: 50,
      previousMonth: 40,
      percentChange: 25,
    });
    expect(trends.patientComparison).toEqual({
      currentMonth: 30,
      previousMonth: 20,
      percentChange: 50,
    });
    expect(trends.noShowComparison).toEqual({
      currentMonth: 5,
      previousMonth: 10,
      percentChange: -50,
    });
  });

  it('should return 0 percentChange when previous month is 0', async () => {
    invoiceModel.aggregate = vi
      .fn()
      .mockResolvedValueOnce([{ _id: null, total: 5000 }])
      .mockResolvedValueOnce([]);

    appointmentModel.countDocuments = vi
      .fn()
      .mockResolvedValueOnce(10) // curr appts
      .mockResolvedValueOnce(0) // prev appts
      .mockResolvedValueOnce(2) // curr no-show
      .mockResolvedValueOnce(0); // prev no-show

    patientModel.countDocuments = vi.fn().mockResolvedValueOnce(15).mockResolvedValueOnce(0);

    const trends = await service.getTrends();

    expect(trends.revenueComparison.percentChange).toBe(0);
    expect(trends.appointmentComparison.percentChange).toBe(0);
    expect(trends.patientComparison.percentChange).toBe(0);
    expect(trends.noShowComparison.percentChange).toBe(0);
  });

  it('should handle negative trends', async () => {
    invoiceModel.aggregate = vi
      .fn()
      .mockResolvedValueOnce([{ _id: null, total: 8000 }])
      .mockResolvedValueOnce([{ _id: null, total: 10000 }]);

    appointmentModel.countDocuments = vi
      .fn()
      .mockResolvedValueOnce(30)
      .mockResolvedValueOnce(50)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(4);

    patientModel.countDocuments = vi.fn().mockResolvedValueOnce(10).mockResolvedValueOnce(20);

    const trends = await service.getTrends();

    // (8000-10000)/10000 * 100 = -20.0
    expect(trends.revenueComparison.percentChange).toBe(-20);
    // (30-50)/50 * 100 = -40.0
    expect(trends.appointmentComparison.percentChange).toBe(-40);
    // (10-20)/20 * 100 = -50.0
    expect(trends.patientComparison.percentChange).toBe(-50);
    // (8-4)/4 * 100 = 100.0
    expect(trends.noShowComparison.percentChange).toBe(100);
  });
});
