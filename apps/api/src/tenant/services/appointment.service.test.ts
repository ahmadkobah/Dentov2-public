import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Connection } from 'mongoose';
import { AppointmentService } from './appointment.service.js';
import { ApiError } from '../../utils/api-response.js';

function chainable<T>(value: T) {
  const chain: Record<string, unknown> = {
    lean: vi.fn().mockResolvedValue(value),
    select: vi.fn(),
    populate: vi.fn(),
    sort: vi.fn(),
    skip: vi.fn(),
    limit: vi.fn(),
  };

  for (const method of ['select', 'populate', 'sort', 'skip', 'limit']) {
    (chain[method] as ReturnType<typeof vi.fn>).mockReturnValue(chain);
  }

  return chain;
}

const mockAppointment = {
  _id: 'appointment-1',
  patientId: { _id: 'patient-1', firstName: 'Pat', lastName: 'One' },
  doctorId: { _id: 'doctor-1', firstName: 'Doc', lastName: 'One' },
  appointmentTypeId: { _id: 'type-1', name: 'Consultation' },
  date: new Date('2026-07-03T00:00:00Z'),
  startTime: '10:00',
  status: 'confirmed',
};

function createMockAppointmentModel() {
  return {
    find: vi.fn().mockImplementation(() => chainable([mockAppointment])),
    findById: vi.fn().mockImplementation(() => chainable(mockAppointment)),
    countDocuments: vi.fn().mockResolvedValue(1),
  };
}

function createMockDoctorModel(doctorId = 'doctor-1') {
  return {
    findOne: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        lean: vi.fn().mockResolvedValue({ _id: doctorId }),
      }),
    }),
  };
}

let mockAppointmentModel: ReturnType<typeof createMockAppointmentModel>;
let mockDoctorModel: ReturnType<typeof createMockDoctorModel>;

vi.mock('@dento/shared', () => ({
  VALID_STATUS_TRANSITIONS: {},
}));

vi.mock('../models/appointment.model.js', () => ({
  getAppointmentModel: () => mockAppointmentModel,
}));

vi.mock('../models/appointment-type.model.js', () => ({
  getAppointmentTypeModel: () => ({}),
}));

vi.mock('../models/patient.model.js', () => ({
  getPatientModel: () => ({}),
}));

vi.mock('../models/doctor.model.js', () => ({
  getDoctorModel: () => mockDoctorModel,
}));

vi.mock('./schedule-validation.service.js', () => ({
  ScheduleValidationService: vi.fn().mockImplementation(function () {
    return { validate: vi.fn() };
  }),
}));

vi.mock('./webhook-dispatcher.js', () => ({
  dispatchWebhook: vi.fn().mockResolvedValue(undefined),
}));

vi.mock('../../plugins/socket.plugin.js', () => ({
  socketEmitter: {
    queueUpdate: vi.fn(),
    chairStatus: vi.fn(),
  },
}));

vi.mock('../../services/notification.service.js', () => ({
  NotificationService: vi.fn().mockImplementation(function () {
    return { send: vi.fn().mockResolvedValue(undefined) };
  }),
}));

vi.mock('../../utils/logger.js', () => ({
  logger: { info: vi.fn(), warn: vi.fn(), error: vi.fn(), debug: vi.fn() },
}));

vi.mock('../../utils/encryption.js', () => ({
  decryptField: (value: string) => value,
}));

describe('AppointmentService self-scoped appointment reads', () => {
  let service: AppointmentService;
  const fakeConnection = { name: 'tenant_test' } as Connection;
  const baseQuery = {
    page: 1,
    limit: 20,
    sortBy: 'date' as const,
    sortOrder: 'asc' as const,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockAppointmentModel = createMockAppointmentModel();
    mockDoctorModel = createMockDoctorModel();
    service = new AppointmentService(fakeConnection);
  });

  it('forces dentist list filters to the caller linked doctor', async () => {
    await service.listAppointments(baseQuery, { userId: 'user-1', role: 'dentist' });

    expect(mockDoctorModel.findOne).toHaveBeenCalledWith({ userId: 'user-1', isActive: true });
    expect(mockAppointmentModel.find).toHaveBeenCalledWith({ doctorId: 'doctor-1' });
    expect(mockAppointmentModel.countDocuments).toHaveBeenCalledWith({ doctorId: 'doctor-1' });
  });

  it('rejects a dentist list query for another doctor', async () => {
    await expect(
      service.listAppointments(
        { ...baseQuery, doctorId: 'doctor-2' },
        { userId: 'user-1', role: 'dentist' },
      ),
    ).rejects.toThrow(ApiError);

    expect(mockAppointmentModel.find).not.toHaveBeenCalled();
  });

  it('rejects dentist detail access for another doctor appointment', async () => {
    mockAppointmentModel.findById = vi.fn().mockImplementation(() =>
      chainable({
        ...mockAppointment,
        doctorId: { _id: 'doctor-2', firstName: 'Doc', lastName: 'Two' },
      }),
    );

    await expect(
      service.getAppointmentById('appointment-1', { userId: 'user-1', role: 'dentist' }),
    ).rejects.toThrow(ApiError);
  });
});
