// domain/nutrition/adherence.test.ts
import { describe, it, expect } from 'vitest';
import { dayAdherence } from './adherence';

describe('dayAdherence', () => {
  it('sin registros -> sin_registro', () => {
    expect(dayAdherence(0, 2000, false)).toBe('sin_registro');
  });
  it('con registros pero sin meta -> sin_meta', () => {
    expect(dayAdherence(1500, null, true)).toBe('sin_meta');
    expect(dayAdherence(1500, 0, true)).toBe('sin_meta');
  });
  it('dentro de ±10% -> cumplido', () => {
    expect(dayAdherence(1950, 2000, true)).toBe('cumplido');
    expect(dayAdherence(2100, 2000, true)).toBe('cumplido');
  });
  it('entre ±10% y ±25% -> cerca', () => {
    expect(dayAdherence(1700, 2000, true)).toBe('cerca');
    expect(dayAdherence(2400, 2000, true)).toBe('cerca');
  });
  it('más allá de ±25% -> lejos', () => {
    expect(dayAdherence(1000, 2000, true)).toBe('lejos');
    expect(dayAdherence(3000, 2000, true)).toBe('lejos');
  });
});
