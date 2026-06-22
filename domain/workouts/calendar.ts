/**
 * Pure training-calendar logic. Works on ISO date strings (YYYY-MM-DD) parsed as
 * UTC midnight to avoid timezone drift. Weekdays are 1=Mon .. 7=Sun. The calendar
 * is COMPUTED from a plan's split days (each mapped to a weekday) + a start date +
 * a duration in weeks; there is no materialized schedule table.
 */

export interface WeekdayDef {
  value: number; // 1=Mon .. 7=Sun
  short: string;
  label: string;
}

export const WEEKDAYS: WeekdayDef[] = [
  { value: 1, short: 'Lun', label: 'Lunes' },
  { value: 2, short: 'Mar', label: 'Martes' },
  { value: 3, short: 'Mié', label: 'Miércoles' },
  { value: 4, short: 'Jue', label: 'Jueves' },
  { value: 5, short: 'Vie', label: 'Viernes' },
  { value: 6, short: 'Sáb', label: 'Sábado' },
  { value: 7, short: 'Dom', label: 'Domingo' },
];

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function parseUTC(dateISO: string): Date {
  const parts = dateISO.split('-').map(Number);
  const y = parts[0] ?? 1970;
  const mo = parts[1] ?? 1;
  const d = parts[2] ?? 1;
  return new Date(Date.UTC(y, mo - 1, d));
}

function fmt(d: Date): string {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** Day of week as 1=Mon .. 7=Sun. */
export function weekdayOf(dateISO: string): number {
  const dow = parseUTC(dateISO).getUTCDay(); // 0=Sun .. 6=Sat
  return dow === 0 ? 7 : dow;
}

export function addDaysISO(dateISO: string, n: number): string {
  const d = parseUTC(dateISO);
  d.setUTCDate(d.getUTCDate() + n);
  return fmt(d);
}

/** Monday of the week that contains dateISO. */
export function startOfWeekISO(dateISO: string): string {
  return addDaysISO(dateISO, -(weekdayOf(dateISO) - 1));
}

export interface PlanWindow {
  startISO: string;
  endExclusiveISO: string;
}

/** Active window [start, start + weeks*7). Null if not schedulable. */
export function planActiveWindow(
  startsAt: string | null | undefined,
  weeks: number | null | undefined,
): PlanWindow | null {
  if (!startsAt || !weeks || weeks < 1) return null;
  return { startISO: startsAt, endExclusiveISO: addDaysISO(startsAt, weeks * 7) };
}

/** True once today is on or after the end of the plan's window. */
export function planHasEnded(
  startsAt: string | null | undefined,
  weeks: number | null | undefined,
  todayISO: string,
): boolean {
  const w = planActiveWindow(startsAt, weeks);
  if (!w) return false;
  return todayISO >= w.endExclusiveISO; // lexicographic compare is valid for ISO dates
}

export interface PlanDayLite {
  id: string;
  day_number: number;
  title: string;
  focus: string | null;
  weekday: number | null;
}

export interface CalendarDay {
  dateISO: string;
  inWindow: boolean;
  planDay: PlanDayLite | null; // null = rest day or outside the active window
}

/**
 * Build the calendar for an inclusive date range. A date gets its plan day when
 * it is inside the active window and its weekday matches a scheduled split day.
 */
export function buildCalendar(
  planDays: PlanDayLite[],
  startsAt: string | null | undefined,
  weeks: number | null | undefined,
  rangeStartISO: string,
  rangeEndISO: string,
): CalendarDay[] {
  const window = planActiveWindow(startsAt, weeks);
  const byWeekday = new Map<number, PlanDayLite>();
  for (const pd of planDays) {
    if (pd.weekday != null && !byWeekday.has(pd.weekday)) byWeekday.set(pd.weekday, pd);
  }

  const out: CalendarDay[] = [];
  let cur = rangeStartISO;
  while (cur <= rangeEndISO) {
    const inWindow = !!window && cur >= window.startISO && cur < window.endExclusiveISO;
    const planDay = inWindow ? (byWeekday.get(weekdayOf(cur)) ?? null) : null;
    out.push({ dateISO: cur, inWindow, planDay });
    cur = addDaysISO(cur, 1);
  }
  return out;
}

/** Calendar grid (Monday-first) covering the given month: rows of 7 ISO dates. */
export function monthGridISO(year: number, month1to12: number): string[][] {
  const firstISO = `${year}-${pad(month1to12)}-01`;
  const lastDayNum = new Date(Date.UTC(year, month1to12, 0)).getUTCDate();
  const lastISO = `${year}-${pad(month1to12)}-${pad(lastDayNum)}`;
  const end = addDaysISO(startOfWeekISO(lastISO), 6); // Sunday of the last week
  const rows: string[][] = [];
  let cur = startOfWeekISO(firstISO);
  while (cur <= end) {
    const row: string[] = [];
    for (let d = 0; d < 7; d++) {
      row.push(cur);
      cur = addDaysISO(cur, 1);
    }
    rows.push(row);
  }
  return rows;
}
