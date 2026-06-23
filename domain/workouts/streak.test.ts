// domain/workouts/streak.test.ts
import { describe, it, expect } from 'vitest';
import { currentStreak, type ScheduledSession } from './streak';

function key(planDayId: string, dateISO: string) {
  return `${planDayId}|${dateISO}`;
}

const scheduled: ScheduledSession[] = [
  { dateISO: '2026-06-01', planDayId: 'p1' }, // lun
  { dateISO: '2026-06-03', planDayId: 'p2' }, // mié
  { dateISO: '2026-06-05', planDayId: 'p3' }, // vie
  { dateISO: '2026-06-08', planDayId: 'p1' }, // lun (hoy)
];

describe('currentStreak', () => {
  it('cuenta sesiones programadas completadas consecutivas hacia atrás', () => {
    const status = {
      [key('p1', '2026-06-01')]: 'completed' as const,
      [key('p2', '2026-06-03')]: 'completed' as const,
      [key('p3', '2026-06-05')]: 'completed' as const,
    };
    // Hoy (2026-06-08) aún no se completa: no rompe, no cuenta.
    expect(currentStreak(scheduled, status, '2026-06-08')).toBe(3);
  });

  it('cuenta hoy si ya está completado', () => {
    const status = {
      [key('p3', '2026-06-05')]: 'completed' as const,
      [key('p1', '2026-06-08')]: 'completed' as const,
    };
    expect(currentStreak(scheduled, status, '2026-06-08')).toBe(2);
  });

  it('una sesión pasada saltada rompe la racha', () => {
    const status = {
      [key('p1', '2026-06-01')]: 'completed' as const,
      [key('p2', '2026-06-03')]: 'skipped' as const,
      [key('p3', '2026-06-05')]: 'completed' as const,
    };
    expect(currentStreak(scheduled, status, '2026-06-08')).toBe(1);
  });

  it('una sesión pasada sin registro rompe la racha', () => {
    const status = {
      [key('p3', '2026-06-05')]: 'completed' as const,
    };
    // p1 (06-01) y p2 (06-03) no tienen registro -> al llegar a ellas, corta.
    expect(currentStreak(scheduled, status, '2026-06-08')).toBe(1);
  });

  it('devuelve 0 sin sesiones programadas', () => {
    expect(currentStreak([], {}, '2026-06-08')).toBe(0);
  });
});
