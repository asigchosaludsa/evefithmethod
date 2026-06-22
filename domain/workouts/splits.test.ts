// domain/workouts/splits.test.ts
import { describe, expect, it } from 'vitest';
import { resolveSplitDays } from './splits';

describe('resolveSplitDays', () => {
  it('genera 3 días para PPL con day_number correlativo', () => {
    const days = resolveSplitDays('ppl');
    expect(days).toHaveLength(3);
    expect(days.map((d) => d.day_number)).toEqual([1, 2, 3]);
    expect(days[0]?.title).toBe('Empuje');
    expect(days[2]?.title).toBe('Pierna');
  });
  it('genera 6 días para arnold', () => {
    expect(resolveSplitDays('arnold')).toHaveLength(6);
  });
  it('devuelve [] para personalizado', () => {
    expect(resolveSplitDays('personalizado')).toEqual([]);
  });
  it('devuelve [] para un valor desconocido', () => {
    expect(resolveSplitDays('no_existe')).toEqual([]);
  });
});
