/**
 * Appointment Calendar — FullCalendar 6 wrapper
 * BUILD_RULES §8.1, Phase 3 Week 8.
 */

import { useRef, useCallback, useMemo } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import listPlugin from '@fullcalendar/list';
import type { EventClickArg, DateSelectArg, EventInput, EventDropArg } from '@fullcalendar/core';
import type { EventResizeDoneArg } from '@fullcalendar/interaction';
import { useThemeStore } from '@/stores/theme.store.js';
import type { AppointmentItem } from '../hooks/useAppointments.js';
import { useTranslation } from '../../../stores/locale.store.js';

/* ── Status → color mapping ───────────────────────────── */

const STATUS_COLORS: Record<string, string> = {
  booked: '#3B82F6', // blue-500
  confirmed: '#10B981', // emerald-500
  arrived: '#8B5CF6', // violet-500
  in_progress: '#F59E0B', // amber-500
  completed: '#6B7280', // gray-500
  no_show: '#EF4444', // red-500
  cancelled: '#9CA3AF', // gray-400
  rescheduled: '#F97316', // orange-500
};

/* ── Custom rolling-week view (today centered) ──────────
 *
 * Defined at module scope so the object identity stays stable across renders.
 * Returning a fresh `views` prop on every render causes FullCalendar to fire
 * `datesSet` repeatedly, which in turn updates parent state and triggers an
 * infinite re-render loop.
 */
const CALENDAR_VIEWS = {
  timeGridRollingWeek: {
    type: 'timeGrid',
    duration: { days: 7 },
    visibleRange: (currentDate: Date) => {
      const start = new Date(currentDate);
      start.setDate(start.getDate() - 3);
      start.setHours(0, 0, 0, 0);
      const end = new Date(start);
      end.setDate(end.getDate() + 7);
      return { start, end };
    },
    buttonText: 'week',
  },
} as const;

/* ── Extra calendar event (e.g. CBCT orders) ──────────── */

export interface CalendarExtraEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  color: string;
  /** When set, onExtraEventClick is called instead of onEventClick */
  type: string;
}

/* ── Props ────────────────────────────────────────────── */

interface AppointmentCalendarProps {
  appointments: AppointmentItem[];
  extraEvents?: CalendarExtraEvent[];
  onEventClick: (appointmentId: string) => void;
  onExtraEventClick?: (id: string, type: string) => void;
  onDateSelect: (start: string, end: string) => void;
  onDateRangeChange: (start: string, end: string) => void;
  onEventDrop?: (
    id: string,
    date: string,
    startTime: string,
    endTime: string,
    revert: () => void,
  ) => void;
}

/* ── Component ────────────────────────────────────────── */

export function AppointmentCalendar({
  appointments,
  extraEvents = [],
  onEventClick,
  onExtraEventClick,
  onDateSelect,
  onDateRangeChange,
  onEventDrop,
}: AppointmentCalendarProps) {
  const calendarRef = useRef<FullCalendar>(null);
  const isRTL = useThemeStore((s) => s.isRTL);
  const locale = useThemeStore((s) => s.locale);
  const { t } = useTranslation();

  /* Map appointments → FullCalendar events */
  const events: EventInput[] = useMemo(
    () =>
      appointments.map((apt) => {
        const patientName =
          apt.patient?.firstName?.[locale === 'ar' ? 'ar' : 'en'] ??
          apt.patient?.firstName?.en ??
          '';
        const patientLast =
          apt.patient?.lastName?.[locale === 'ar' ? 'ar' : 'en'] ?? apt.patient?.lastName?.en ?? '';

        // apt.date may be a full ISO string; extract YYYY-MM-DD portion
        const dateStr = typeof apt.date === 'string' ? apt.date.split('T')[0] : apt.date;

        return {
          id: apt._id,
          title: `${patientName} ${patientLast}`.trim() || t('appointments.calendar.fallback'),
          start: `${dateStr}T${apt.startTime}`,
          end: `${dateStr}T${apt.endTime}`,
          backgroundColor: apt.appointmentType?.color ?? STATUS_COLORS[apt.status] ?? '#3B82F6',
          borderColor: apt.appointmentType?.color ?? STATUS_COLORS[apt.status] ?? '#3B82F6',
          extendedProps: {
            status: apt.status,
            type: apt.type,
            doctor: apt.doctor,
            patient: apt.patient,
          },
        };
      }),
    [appointments, locale],
  );

  /* Merge extra events (CBCT, etc.) */
  const allEvents: EventInput[] = useMemo(
    () => [
      ...events,
      ...extraEvents.map((ev) => ({
        id: ev.id,
        title: ev.title,
        start: ev.start,
        end: ev.end,
        backgroundColor: ev.color,
        borderColor: ev.color,
        editable: false,
        extendedProps: { eventType: ev.type },
      })),
    ],
    [events, extraEvents],
  );

  /* Handlers */
  const handleEventClick = useCallback(
    (info: EventClickArg) => {
      const eventType = info.event.extendedProps?.eventType as string | undefined;
      if (eventType && onExtraEventClick) {
        onExtraEventClick(info.event.id, eventType);
      } else {
        onEventClick(info.event.id);
      }
    },
    [onEventClick, onExtraEventClick],
  );

  const handleDateSelect = useCallback(
    (info: DateSelectArg) => {
      const startDate = info.startStr.split('T')[0] ?? info.startStr;
      const startTime = info.startStr.includes('T')
        ? (info.startStr.split('T')[1]?.substring(0, 5) ?? '09:00')
        : '09:00';
      const endTime = info.endStr.includes('T')
        ? (info.endStr.split('T')[1]?.substring(0, 5) ?? '09:30')
        : '09:30';
      onDateSelect(`${startDate}T${startTime}`, `${startDate}T${endTime}`);
    },
    [onDateSelect],
  );

  const handleDatesSet = useCallback(
    (arg: { startStr: string; endStr: string }) => {
      const start = arg.startStr.split('T')[0] ?? arg.startStr;
      const end = arg.endStr.split('T')[0] ?? arg.endStr;
      onDateRangeChange(start, end);
    },
    [onDateRangeChange],
  );

  /** Extract date and HH:mm from a Date or ISO string */
  const extractDateTime = (dt: Date | null) => {
    if (!dt) return { date: '', time: '09:00' };
    const date = dt.toISOString().split('T')[0] ?? '';
    const time = `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
    return { date, time };
  };

  const handleEventDrop = useCallback(
    (info: EventDropArg) => {
      if (!onEventDrop) {
        info.revert();
        return;
      }
      const { date, time: startTime } = extractDateTime(info.event.start);
      const { time: endTime } = extractDateTime(info.event.end);
      onEventDrop(info.event.id, date, startTime, endTime, info.revert);
    },
    [onEventDrop],
  );

  const handleEventResize = useCallback(
    (info: EventResizeDoneArg) => {
      if (!onEventDrop) {
        info.revert();
        return;
      }
      const { date, time: startTime } = extractDateTime(info.event.start);
      const { time: endTime } = extractDateTime(info.event.end);
      onEventDrop(info.event.id, date, startTime, endTime, info.revert);
    },
    [onEventDrop],
  );

  return (
    <div className="rounded-xl border bg-white p-4 dark:bg-gray-900 dark:border-gray-800">
      <FullCalendar
        ref={calendarRef}
        plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, listPlugin]}
        initialView="timeGridRollingWeek"
        views={CALENDAR_VIEWS}
        headerToolbar={{
          start: 'prev,next today',
          center: 'title',
          end: 'dayGridMonth,timeGridRollingWeek,timeGridDay,listWeek',
        }}
        direction={isRTL ? 'rtl' : 'ltr'}
        locale={locale}
        events={allEvents}
        editable={!!onEventDrop}
        eventDurationEditable={!!onEventDrop}
        selectable
        selectMirror
        select={handleDateSelect}
        eventClick={handleEventClick}
        eventDrop={handleEventDrop}
        eventResize={handleEventResize}
        datesSet={handleDatesSet}
        nowIndicator
        slotMinTime="07:00:00"
        slotMaxTime="22:00:00"
        slotDuration="00:15:00"
        allDaySlot={false}
        expandRows
        stickyHeaderDates
        dayMaxEvents
        height="auto"
        eventDisplay="block"
        eventTimeFormat={{
          hour: '2-digit',
          minute: '2-digit',
          meridiem: false,
          hour12: false,
        }}
      />
    </div>
  );
}
