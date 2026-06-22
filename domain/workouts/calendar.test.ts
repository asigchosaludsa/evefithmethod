import { describe, it, expect } from 'vitest';
import {
  weekdayOf,
  addDaysISO,
  startOfWeekISO,
  planActiveWindow,
  planHasEnded,
  buildCalendar,
  monthGridISO,
  type PlanDayLite,
} from './calendar';

// 2026-06-22 is a Monday.
describe('weekdayOf', () => {
  it('maps Monday to 1 and Sunday to 7', () => {
    expect(weekdayOf('2026-06-22')).toBe(1); // Mon
    expect(weekdayOf('2026-06-24')).toBe(3); // Wed
    expect(weekdayOf('2026-06-26')).toBe(5); // Fri
    expect(weekdayOf('2026-06-28')).toBe(7); // Sun
  });
});

describe('addDaysISO', () => {
  it('adds and crosses month boundaries', () => {
    expect(addDaysISO('2026-06-22', 1)).toBe('2026-06-23');
    expect(addDaysISO('2026-06-30', 1)).toBe('2026-07-01');
    expect(addDaysISO('2026-07-01', -1)).toBe('2026-06-30');
  });
});

describe('startOfWeekISO', () => {
  it('returns the Monday of the week', () => {
    expect(startOfWeekISO('2026-06-24')).toBe('2026-06-22'); // Wed -> Mon
    expect(startOfWeekISO('2026-06-22')).toBe('2026-06-22'); // Mon -> itself
    expect(startOfWeekISO('2026-06-28')).toBe('2026-06-22'); // Sun -> prior Mon
  });
});

describe('planActiveWindow / planHasEnded', () => {
  it('computes a 2-week window and end detection', () => {
    const w = planActiveWindow('2026-06-22', 2);
    expect(w).toEqual({ startISO: '2026-06-22', endExclusiveISO: '2026-07-06' });
    expect(planHasEnded('2026-06-22', 2, '2026-07-05')).toBe(false);
    expect(planHasEnded('2026-06-22', 2, '2026-07-06')).toBe(true);
    expect(planActiveWindow(null, 2)).toBeNull();
    expect(planHasEnded(null, null, '2026-07-06')).toBe(false);
  });
});

describe('buildCalendar', () => {
  const days: PlanDayLite[] = [
    { id: 'a', day_number: 1, title: 'Empuje', focus: 'Empuje', weekday: 1 },
    { id: 'b', day_number: 2, title: 'Jalón', focus: 'Jalón', weekday: 3 },
    { id: 'c', day_number: 3, title: 'Pierna', focus: 'Pierna', weekday: 5 },
  ];

  it('places split days on their weekday, rest days null', () => {
    const cal = buildCalendar(days, '2026-06-22', 2, '2026-06-22', '2026-06-28');
    const byDate = new Map(cal.map((c) => [c.dateISO, c]));
    expect(byDate.get('2026-06-22')?.planDay?.focus).toBe('Empuje'); // Mon
    expect(byDate.get('2026-06-23')?.planDay).toBeNull(); // Tue rest
    expect(byDate.get('2026-06-24')?.planDay?.focus).toBe('Jalón'); // Wed
    expect(byDate.get('2026-06-26')?.planDay?.focus).toBe('Pierna'); // Fri
    expect(byDate.get('2026-06-28')?.planDay).toBeNull(); // Sun rest
    expect(cal.every((c) => c.inWindow)).toBe(true);
  });

  it('marks dates outside the window as not in-window with no plan day', () => {
    // Window ends exclusive 2026-07-06; that Monday must be out.
    const cal = buildCalendar(days, '2026-06-22', 2, '2026-07-06', '2026-07-06');
    expect(cal[0]?.inWindow).toBe(false);
    expect(cal[0]?.planDay).toBeNull();
  });
});

describe('monthGridISO', () => {
  it('returns Monday-first rows of 7 covering the month', () => {
    const grid = monthGridISO(2026, 6); // June 2026
    expect(grid.every((row) => row.length === 7)).toBe(true);
    const firstCell = grid[0]?.[0] ?? '';
    expect(weekdayOf(firstCell)).toBe(1); // first cell is a Monday
    // June 1 2026 is a Monday, so the grid starts exactly on it.
    expect(firstCell).toBe('2026-06-01');
    // The month's last day (June 30) must appear somewhere in the grid.
    expect(grid.flat()).toContain('2026-06-30');
  });
});
