import { describe, it, expect } from 'vitest';
import { goalProgressPct, remainingToGoal } from './goals';

describe('goalProgressPct', () => {
  it('bajando de peso: 80→75 con meta 70 = 50%', () => {
    expect(goalProgressPct(80, 75, 70)).toBe(50);
  });
  it('subiendo de peso: 60→65 con meta 70 = 50%', () => {
    expect(goalProgressPct(60, 65, 70)).toBe(50);
  });
  it('pasarse de la meta capa a 100', () => {
    expect(goalProgressPct(80, 68, 70)).toBe(100);
  });
  it('ir en sentido contrario capa a 0', () => {
    expect(goalProgressPct(80, 82, 70)).toBe(0);
  });
  it('meta igual al inicio = 100', () => {
    expect(goalProgressPct(70, 70, 70)).toBe(100);
  });
  it('faltan datos = null', () => {
    expect(goalProgressPct(null, 75, 70)).toBeNull();
    expect(goalProgressPct(80, 75, null)).toBeNull();
  });
});

describe('remainingToGoal', () => {
  it('kg que faltan (absoluto, 1 decimal)', () => {
    expect(remainingToGoal(75, 70)).toBe(5);
    expect(remainingToGoal(68.4, 70)).toBe(1.6);
  });
  it('null si faltan datos', () => {
    expect(remainingToGoal(null, 70)).toBeNull();
  });
});
