import { describe, expect, it } from 'vitest';
import {
  calculateWorkoutVolume,
  calculateWorkoutCompletion,
  calculateWeeklyWorkoutAdherence,
  estimateOneRepMax,
} from './calculations';

describe('calculateWorkoutVolume', () => {
  it('sums reps * weight across sets', () => {
    expect(
      calculateWorkoutVolume([
        { reps_completed: 10, weight_kg: 40 },
        { reps_completed: 8, weight_kg: 40 },
      ]),
    ).toBe(720);
  });
  it('ignores sets missing reps or weight', () => {
    expect(
      calculateWorkoutVolume([
        { reps_completed: 10, weight_kg: 40 },
        { reps_completed: null, weight_kg: 40 },
        { reps_completed: 10, weight_kg: null },
      ]),
    ).toBe(400);
  });
});

describe('calculateWorkoutCompletion', () => {
  it('returns completed percentage', () => {
    expect(calculateWorkoutCompletion([{ completed: true }, { completed: false }, { completed: true }])).toBe(67);
  });
  it('is 0 for no sets', () => {
    expect(calculateWorkoutCompletion([])).toBe(0);
  });
});

describe('calculateWeeklyWorkoutAdherence', () => {
  it('is completed / assigned as percent', () => {
    expect(calculateWeeklyWorkoutAdherence(3, 4)).toBe(75);
  });
  it('is 0 when nothing assigned', () => {
    expect(calculateWeeklyWorkoutAdherence(0, 0)).toBe(0);
  });
  it('caps at 100', () => {
    expect(calculateWeeklyWorkoutAdherence(5, 4)).toBe(100);
  });
});

describe('estimateOneRepMax', () => {
  it('uses the Epley formula', () => {
    // 100kg x 5 reps -> 100 * (1 + 5/30) = 116.7
    expect(estimateOneRepMax(100, 5)).toBe(116.7);
  });
  it('returns the weight for a single rep', () => {
    expect(estimateOneRepMax(80, 1)).toBe(80);
  });
});
