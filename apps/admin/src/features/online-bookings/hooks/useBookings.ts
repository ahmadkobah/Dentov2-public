import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client.js';
import type { PaginationMeta } from '@/lib/types.js';

// ── Types ──────────────────────────────────────────────────

export interface OnlineBookingData {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  preferredLanguage?: 'en' | 'ar';
  isOnlineBooking: boolean;
  isConfirmed?: boolean;
  confirmedBy?: string;
  confirmedAt?: string;
  hasChanges?: boolean;
  rejectionReason?: string;
}

export interface BookingAppointment {
  _id: string;
  patientId?: string;
  doctorId?: string;
  branchId?: string;
  date: string;
  startTime: string;
  endTime: string;
  status: 'booked' | 'confirmed' | 'cancelled' | 'completed' | 'no_show';
  source: 'admin' | 'website' | 'phone' | 'walk_in' | 'referral' | 'whatsapp';
  appointmentTypeId?: string;
  reason?: string;
  notes?: string;
  onlineBookingData?: OnlineBookingData;
  createdAt: string;
  updatedAt: string;
  // Populated fields
  patient?: { firstName: { en: string }; lastName: { en: string }; phone?: string };
  doctor?: { firstName: string; lastName: string; specialization?: string };
  branch?: { name: { en: string; ar?: string } };
}

export interface BookingFilters {
  page?: number;
  limit?: number;
  status?: 'pending' | 'confirmed' | 'rejected' | 'cancelled';
  dateFrom?: string;
  dateTo?: string;
  branchId?: string;
  doctorId?: string;
}

export type BookingAction = 'confirm' | 'confirm_with_changes' | 'reject';

export interface ProcessBookingData {
  action: BookingAction;
  newDate?: string;
  newStartTime?: string;
  newEndTime?: string;
  newDoctorId?: string;
  rejectionReason?: string;
  patientMessage?: string;
}

// ── Query Keys ─────────────────────────────────────────────

const bookingKeys = {
  all: ['online-bookings'] as const,
  lists: () => [...bookingKeys.all, 'list'] as const,
  list: (filters: BookingFilters) => [...bookingKeys.lists(), filters] as const,
  slots: (params: SlotQuery) => [...bookingKeys.all, 'slots', params] as const,
};

// ── Queries ────────────────────────────────────────────────

export function useBookingList(filters: BookingFilters = {}) {
  return useQuery({
    queryKey: bookingKeys.list(filters),
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (filters.page) params.page = filters.page;
      if (filters.limit) params.limit = filters.limit;
      if (filters.status) params.status = filters.status;
      if (filters.dateFrom) params.dateFrom = filters.dateFrom;
      if (filters.dateTo) params.dateTo = filters.dateTo;
      if (filters.branchId) params.branchId = filters.branchId;
      if (filters.doctorId) params.doctorId = filters.doctorId;

      const res = await apiClient.get<{
        data: {
          bookings: BookingAppointment[];
          total: number;
          page: number;
          limit: number;
          totalPages: number;
        };
      }>('/api/bookings/management', { params });

      return res.data;
    },
    select: (data) => ({
      bookings: data.bookings,
      meta: {
        total: data.total,
        page: data.page,
        limit: data.limit,
        totalPages: data.totalPages,
      } as PaginationMeta,
    }),
  });
}

// ── Mutations ──────────────────────────────────────────────

export function useProcessBooking() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: ProcessBookingData }) => {
      const res = await apiClient.patch<{ data: { booking: BookingAppointment } }>(
        `/api/bookings/management/${id}`,
        data,
      );
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: bookingKeys.all });
    },
  });
}

// ── Slot Types ─────────────────────────────────────────────

export interface Slot {
  startTime: string;
  endTime: string;
  isAvailable: boolean;
}

export interface SlotResult {
  date: string;
  branchId: string;
  doctorId: string;
  slots: Slot[];
  meta: {
    branchName: string;
    effectiveStart: string;
    effectiveEnd: string;
    slotDuration: number;
    bufferBetween: number;
    totalSlots: number;
    availableSlots: number;
  };
}

export interface DoctorSlotResult extends SlotResult {
  doctorName: string;
}

export interface SlotQuery {
  branchId: string;
  doctorId?: string;
  date: string;
  durationMinutes?: number;
}

// ── Slot Queries ───────────────────────────────────────────

export function useAvailableSlots(query: SlotQuery) {
  return useQuery({
    queryKey: bookingKeys.slots(query),
    queryFn: async () => {
      const params: Record<string, string | number> = {
        branchId: query.branchId,
        date: query.date,
      };
      if (query.doctorId) params.doctorId = query.doctorId;
      if (query.durationMinutes) params.durationMinutes = query.durationMinutes;

      const res = await apiClient.get<{
        data: SlotResult | { doctorSlots: DoctorSlotResult[] };
      }>('/api/bookings/management/slots', { params });

      return res.data;
    },
    enabled: !!query.branchId && !!query.date,
    staleTime: 30_000,
  });
}
