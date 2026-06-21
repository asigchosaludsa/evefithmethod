import { describe, expect, it } from 'vitest';
import {
  calculateWeightChange,
  calculateWeeklyWeightTrend,
  calculateMeasurementChange,
  buildWeeklyProgressSummary,
} from './calculations';

describe('calculateWeightChange', () => {
  it('returns delta and direction (down)', () => {
    expect(calculateWeightChange(68, 70)).toEqual({ delta: -2, direction: 'down' });
  });
  it('returns up', () => {
    expect(calculateWeightChange(72, 70)).toEqual({ delta: 2, direction: 'up' });
  });
  it('returns stable', () => {
    expect(calculateWeightChange(70, 70)).toEqual({ delta: 0, direction: 'stable' });
  });
});

describe('calculateWeeklyWeightTrend', () => {
  it('detects downward trend by date order', () => {
    const t = calculateWeeklyWeightTrend([
      { weight_kg: 70, recorded_at: '2026-06-01' },
      { weight_kg: 69, recorded_at: '2026-06-08' },
    ]);
    expect(t.direction).toBe('down');
    expect(t.change).toBe(-1);
  });
  it('is stable with a single entry', () => {
    expect(calculateWeeklyWeightTrend([{ weight_kg: 70, recorded_at: '2026-06-01' }]).direction).toBe('stable');
  });
  it('is stable with no entries', () => {
    expect(calculateWeeklyWeightTrend([]).direction).toBe('stable');
  });
});

describe('calculateMeasurementChange', () => {
  it('returns delta and direction', () => {
    expect(calculateMeasurementChange(78, 80)).toEqual({ delta: -2, direction: 'down' });
  });
});

describe('buildWeeklyProgressSummary', () => {
  it('summarizes counts and weight trend', () => {
    const summary = buildWeeklyProgressSummary({
      weights: [
        { weight_kg: 70, recorded_at: '2026-06-01' },
        { weight_kg: 69, recorded_at: '2026-06-08' },
      ],
      workoutsCompleted: 3,
      foodLogsCount: 12,
    });
    expect(summary.weightTrend.direction).toBe('down');
    expect(summary.workoutsCompleted).toBe(3);
    expect(summary.foodLogsCount).toBe(12);
  });
});
