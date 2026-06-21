import { describe, expect, it } from 'vitest';
import {
  detectNoFoodLogs,
  detectLowProteinAdherence,
  detectMissedWorkouts,
  detectWeightSpike,
  detectPositiveProgress,
  createCoachAlert,
} from './rules';

describe('detectNoFoodLogs', () => {
  it('flags a warning when the last log is older than the window', () => {
    const a = detectNoFoodLogs({ lastFoodLogAt: '2026-06-10' }, '2026-06-15', 3);
    expect(a?.severity).toBe('warning');
    expect(a?.type).toBe('no_food_logs');
  });
  it('flags when there is no log at all', () => {
    expect(detectNoFoodLogs({ lastFoodLogAt: null }, '2026-06-15', 3)?.type).toBe('no_food_logs');
  });
  it('returns null when within the window', () => {
    expect(detectNoFoodLogs({ lastFoodLogAt: '2026-06-14' }, '2026-06-15', 3)).toBeNull();
  });
});

describe('detectLowProteinAdherence', () => {
  it('flags when protein adherence is low', () => {
    expect(detectLowProteinAdherence(55)?.type).toBe('low_protein');
  });
  it('returns null when adherence is good', () => {
    expect(detectLowProteinAdherence(85)).toBeNull();
  });
});

describe('detectMissedWorkouts', () => {
  it('flags when no workout within the window', () => {
    expect(detectMissedWorkouts({ lastWorkoutAt: '2026-06-01' }, '2026-06-15', 7)?.type).toBe('missed_workouts');
  });
  it('returns null when recent', () => {
    expect(detectMissedWorkouts({ lastWorkoutAt: '2026-06-14' }, '2026-06-15', 7)).toBeNull();
  });
});

describe('detectWeightSpike', () => {
  it('flags an info alert on a large jump', () => {
    const a = detectWeightSpike([
      { weight_kg: 70, recorded_at: '2026-06-01' },
      { weight_kg: 73, recorded_at: '2026-06-03' },
    ]);
    expect(a?.type).toBe('weight_spike');
  });
  it('returns null on a normal change', () => {
    expect(
      detectWeightSpike([
        { weight_kg: 70, recorded_at: '2026-06-01' },
        { weight_kg: 69.8, recorded_at: '2026-06-03' },
      ]),
    ).toBeNull();
  });
});

describe('detectPositiveProgress', () => {
  it('returns a success alert when trending toward a loss goal', () => {
    const a = detectPositiveProgress(
      [
        { weight_kg: 72, recorded_at: '2026-06-01' },
        { weight_kg: 70, recorded_at: '2026-06-10' },
      ],
      'loss',
    );
    expect(a?.severity).toBe('success');
  });
});

describe('createCoachAlert', () => {
  it('normalizes a coach-authored alert', () => {
    const a = createCoachAlert({ type: 'custom', title: 'Revisar postura', message: 'Ojo con la espalda' });
    expect(a).toEqual({
      type: 'custom',
      severity: 'info',
      title: 'Revisar postura',
      message: 'Ojo con la espalda',
      source: 'coach',
    });
  });
});
