/**
 * Slot Calendar View — Visual free/busy slot calendar for online bookings
 *
 * Shows available time slots on a FullCalendar 6 weekly view.
 * Admin selects a branch + optionally a doctor to see slot availability.
 * Available slots render as green events; unavailable as gray.
 */

import { useState, useMemo, useCallback } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { DatesSetArg, EventInput } from '@fullcalendar/core';
import {
  Card,
  CardContent,
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
  Badge,
  Label,
} from '@dento/ui';
import { Loader2 } from 'lucide-react';
import { useActiveBranches } from '@/features/branches/hooks/useBranches.js';
import { useDoctorList } from '@/features/doctors/hooks/useDoctors.js';
import { useAvailableSlots, type SlotResult, type DoctorSlotResult } from '../hooks/useBookings.js';
import { useThemeStore } from '@/stores/theme.store.js';
import { useTranslation } from '../../../stores/locale.store.js';

// ── Helpers ─────────────────────────────────────────────────

function formatDateStr(date: Date): string {
  return date.toISOString().split('T')[0]!;
}

// ── Slot colors ─────────────────────────────────────────────

const SLOT_AVAILABLE_BG = '#10B981'; // emerald-500
const SLOT_UNAVAILABLE_BG = '#D1D5DB'; // gray-300

// ── Component ───────────────────────────────────────────────

export function SlotCalendarView() {
  const isRTL = useThemeStore((s) => s.isRTL);
  const locale = useThemeStore((s) => s.locale);
  const { t } = useTranslation();

  // Filter state
  const [branchId, setBranchId] = useState<string>('');
  const [doctorId, setDoctorId] = useState<string>('');
  const [selectedDate, setSelectedDate] = useState<string>(() => formatDateStr(new Date()));

  // Data queries
  const { data: branches, isLoading: branchesLoading } = useActiveBranches();
  const { data: doctorsData } = useDoctorList({ page: 1, limit: 100, isActive: true });
  const doctors = doctorsData?.items ?? [];

  // We query one day at a time via the slot API
  // For the calendar view, we query the "primary" selected date
  // and let FullCalendar navigate
  const { data: slotData, isLoading: slotsLoading } = useAvailableSlots({
    branchId,
    doctorId: doctorId || undefined,
    date: selectedDate,
    durationMinutes: 30,
  });

  // Convert slot data to FullCalendar events
  const events: EventInput[] = useMemo(() => {
    if (!slotData) return [];

    // If single-doctor response: SlotResult with .slots
    if ('slots' in slotData) {
      const result = slotData as SlotResult;
      return result.slots.map((slot, idx) => ({
        id: `slot-${result.date}-${idx}`,
        title: slot.isAvailable
          ? t('onlineBookings.slots.available')
          : t('onlineBookings.slots.occupied'),
        start: `${result.date}T${slot.startTime}`,
        end: `${result.date}T${slot.endTime}`,
        backgroundColor: slot.isAvailable ? SLOT_AVAILABLE_BG : SLOT_UNAVAILABLE_BG,
        borderColor: slot.isAvailable ? SLOT_AVAILABLE_BG : SLOT_UNAVAILABLE_BG,
        textColor: slot.isAvailable ? '#fff' : '#6B7280',
        display: 'block',
        extendedProps: {
          isAvailable: slot.isAvailable,
        },
      }));
    }

    // If all-doctors response: { doctorSlots: DoctorSlotResult[] }
    if ('doctorSlots' in slotData) {
      const allEvents: EventInput[] = [];
      const doctorColors = ['#3B82F6', '#8B5CF6', '#F59E0B', '#EF4444', '#06B6D4', '#EC4899'];

      (slotData.doctorSlots as DoctorSlotResult[]).forEach((docResult, docIdx) => {
        const color = doctorColors[docIdx % doctorColors.length];
        docResult.slots
          .filter((slot) => slot.isAvailable)
          .forEach((slot, slotIdx) => {
            allEvents.push({
              id: `slot-${docResult.doctorId}-${docResult.date}-${slotIdx}`,
              title: `${docResult.doctorName}`,
              start: `${docResult.date}T${slot.startTime}`,
              end: `${docResult.date}T${slot.endTime}`,
              backgroundColor: color,
              borderColor: color,
              textColor: '#fff',
              display: 'block',
              extendedProps: {
                isAvailable: true,
                doctorId: docResult.doctorId,
                doctorName: docResult.doctorName,
              },
            });
          });
      });
      return allEvents;
    }

    return [];
  }, [slotData, t]);

  // Calendar navigation handler
  const handleDatesSet = useCallback((arg: DatesSetArg) => {
    const start = arg.startStr.split('T')[0] ?? arg.startStr;
    setSelectedDate(start);
  }, []);

  // Summary stats
  const totalSlots = events.length;
  const availableSlots = events.filter((e) => e.extendedProps?.isAvailable).length;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-end gap-4">
            <div className="space-y-1.5">
              <Label className="text-sm">{t('onlineBookings.slots.branch')}</Label>
              <Select value={branchId} onValueChange={setBranchId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('onlineBookings.slots.selectBranch')} />
                </SelectTrigger>
                <SelectContent>
                  {branchesLoading ? (
                    <SelectItem value="" disabled>
                      {t('onlineBookings.slots.loading')}
                    </SelectItem>
                  ) : (
                    branches?.map((b) => (
                      <SelectItem key={b._id} value={b._id}>
                        {b.name.en}
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">{t('onlineBookings.slots.doctor')}</Label>
              <Select value={doctorId} onValueChange={setDoctorId}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder={t('onlineBookings.slots.allDoctors')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">{t('onlineBookings.slots.allDoctors')}</SelectItem>
                  {doctors.map((doc) => (
                    <SelectItem key={doc._id} value={doc._id}>
                      Dr. {doc.firstName} {doc.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Stats */}
            {branchId && !slotsLoading && (
              <div className="flex items-center gap-3 ms-auto">
                <Badge variant="outline" className="gap-1.5 py-1">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: SLOT_AVAILABLE_BG }}
                  />
                  {t('onlineBookings.slots.availableCount', { count: availableSlots })}
                </Badge>
                <Badge variant="secondary" className="gap-1.5 py-1">
                  <span
                    className="inline-block h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: SLOT_UNAVAILABLE_BG }}
                  />
                  {t('onlineBookings.slots.occupiedCount', {
                    count: totalSlots - availableSlots,
                  })}
                </Badge>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Calendar */}
      {!branchId ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <p className="text-muted-foreground">{t('onlineBookings.slots.selectBranchPrompt')}</p>
          </CardContent>
        </Card>
      ) : slotsLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </CardContent>
        </Card>
      ) : (
        <div className="rounded-xl border bg-white p-4 dark:bg-gray-900 dark:border-gray-800">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="timeGridDay"
            headerToolbar={{
              start: 'prev,next today',
              center: 'title',
              end: 'timeGridDay,timeGridWeek',
            }}
            direction={isRTL ? 'rtl' : 'ltr'}
            locale={locale}
            events={events}
            editable={false}
            selectable={false}
            datesSet={handleDatesSet}
            nowIndicator
            slotMinTime="07:00:00"
            slotMaxTime="22:00:00"
            slotDuration="00:15:00"
            allDaySlot={false}
            expandRows
            stickyHeaderDates
            dayMaxEvents={false}
            height="auto"
            eventContent={(arg) => {
              const isAvailable = arg.event.extendedProps.isAvailable;
              return (
                <div className="p-0.5 text-xs leading-tight truncate">
                  <span className={isAvailable ? 'font-medium' : 'opacity-60'}>
                    {arg.event.title}
                  </span>
                </div>
              );
            }}
          />
        </div>
      )}
    </div>
  );
}
