/**
 * Hijri Calendar Utilities — Ramadan Date Lookup
 *
 * Per GAP_IMPLEMENTATION_PLAN — Sprint 4.4
 *
 * Uses a hardcoded lookup table for Ramadan start/end dates (Gregorian equivalents).
 * Covers 1446–1455 AH (2025–2034 CE). Extend as needed.
 *
 * Note: Exact dates may shift ±1 day based on moon sighting.
 * For production, consider using umm-al-qura calendar data.
 */

interface RamadanDates {
  hijriYear: number;
  start: string; // YYYY-MM-DD (Gregorian)
  end: string; // YYYY-MM-DD (Gregorian) — last day of Ramadan
}

/**
 * Hardcoded Ramadan start/end dates (Gregorian) for upcoming Hijri years.
 * Based on Umm al-Qura calendar projections.
 */
const RAMADAN_TABLE: RamadanDates[] = [
  { hijriYear: 1446, start: '2025-02-28', end: '2025-03-29' },
  { hijriYear: 1447, start: '2026-02-17', end: '2026-03-19' },
  { hijriYear: 1448, start: '2027-02-07', end: '2027-03-08' },
  { hijriYear: 1449, start: '2028-01-27', end: '2028-02-25' },
  { hijriYear: 1450, start: '2029-01-15', end: '2029-02-13' },
  { hijriYear: 1451, start: '2030-01-05', end: '2030-02-03' },
  { hijriYear: 1452, start: '2030-12-26', end: '2031-01-23' },
  { hijriYear: 1453, start: '2031-12-15', end: '2032-01-13' },
  { hijriYear: 1454, start: '2032-12-03', end: '2033-01-01' },
  { hijriYear: 1455, start: '2033-11-23', end: '2033-12-22' },
];

/**
 * Get the next upcoming Ramadan dates relative to a given date.
 * Returns null if no entry found in the lookup table.
 */
export function getNextRamadan(referenceDate: Date = new Date()): RamadanDates | null {
  const ref = referenceDate.toISOString().slice(0, 10);

  for (const entry of RAMADAN_TABLE) {
    // If Ramadan hasn't ended yet relative to reference date, it's the next one
    if (entry.end >= ref) {
      return entry;
    }
  }

  return null;
}

/**
 * Check if a given date falls within Ramadan.
 */
export function isDuringRamadan(date: Date = new Date()): boolean {
  const dateStr = date.toISOString().slice(0, 10);

  return RAMADAN_TABLE.some((entry) => dateStr >= entry.start && dateStr <= entry.end);
}

/**
 * Get the number of days until the next Ramadan starts.
 * Returns 0 if currently during Ramadan.
 * Returns -1 if no upcoming Ramadan found in the table.
 */
export function daysUntilRamadan(referenceDate: Date = new Date()): number {
  const next = getNextRamadan(referenceDate);
  if (!next) return -1;

  const ref = new Date(referenceDate.toISOString().slice(0, 10));
  const start = new Date(next.start);

  if (ref >= start) return 0; // Already in Ramadan

  const diffMs = start.getTime() - ref.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
