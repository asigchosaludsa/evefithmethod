import { describe, expect, it } from 'vitest';
import {
  calculateBMR,
  calculateTDEE,
  applyGoalAdjustment,
  calculateMacros,
  safetyCheck,
  calculateEnergy,
} from './energy';

describe('calculateBMR', () => {
  it('Mifflin-St Jeor female (62 kg, 165 cm, 28 yr) → 1350 kcal', () => {
    const r = calculateBMR({ sex: 'female', weight_kg: 62, height_cm: 165, age: 28 });
    expect(r.bmr).toBe(1350);
    expect(r.formula).toBe('mifflin');
  });

  it('Mifflin-St Jeor male (80 kg, 178 cm, 30 yr) → 1768 kcal', () => {
    const r = calculateBMR({ sex: 'male', weight_kg: 80, height_cm: 178, age: 30 });
    expect(r.bmr).toBe(1768);
    expect(r.formula).toBe('mifflin');
  });

  it('Katch-McArdle when bodyfat_pct provided (62 kg, 25 %) → 1374 kcal', () => {
    const r = calculateBMR({ sex: 'female', weight_kg: 62, height_cm: 165, age: 28, bodyfat_pct: 25 });
    expect(r.bmr).toBe(1374);
    expect(r.formula).toBe('katch');
  });
});

describe('calculateTDEE', () => {
  it('moderate × 1350 → 2093', () => {
    expect(calculateTDEE(1350, 'moderate')).toBe(2093);
  });

  it('sedentary × 1350 → 1620', () => {
    expect(calculateTDEE(1350, 'sedentary')).toBe(1620);
  });
});

describe('applyGoalAdjustment', () => {
  it('−18% deficit on 2093 → 1716 kcal, ≈ −0.34 kg/week', () => {
    const r = applyGoalAdjustment(2093, -18);
    expect(r.target_kcal).toBe(1716);
    expect(r.kg_per_week).toBeCloseTo(-0.34, 1);
  });

  it('0% → maintenance, 0 kg/week', () => {
    const r = applyGoalAdjustment(2000, 0);
    expect(r.target_kcal).toBe(2000);
    expect(r.kg_per_week).toBe(0);
  });

  it('+10% surplus on 2000 → 2200 kcal, positive rate', () => {
    const r = applyGoalAdjustment(2000, 10);
    expect(r.target_kcal).toBe(2200);
    expect(r.kg_per_week).toBeGreaterThan(0);
  });
});

describe('calculateMacros', () => {
  it('1716 kcal, 62 kg, 2.0 protein, 0.9 fat → P:124 F:56 C:179', () => {
    const r = calculateMacros({
      target_kcal: 1716,
      weight_kg: 62,
      protein_multiplier: 2.0,
      fat_multiplier: 0.9,
    });
    expect(r.protein_g).toBe(124);
    expect(r.fat_g).toBe(56);
    expect(r.carbs_g).toBe(179);
  });

  it('carbs cannot go negative', () => {
    const r = calculateMacros({
      target_kcal: 800,
      weight_kg: 80,
      protein_multiplier: 2.2,
      fat_multiplier: 1.0,
    });
    expect(r.carbs_g).toBeGreaterThanOrEqual(0);
  });
});

describe('safetyCheck', () => {
  it('warns bajo_piso when female < 1200 kcal', () => {
    const w = safetyCheck({ target_kcal: 1100, sex: 'female', weight_kg: 60, kg_per_week: -0.2 });
    expect(w).toContain('bajo_piso');
  });

  it('warns bajo_piso when male < 1500 kcal', () => {
    const w = safetyCheck({ target_kcal: 1400, sex: 'male', weight_kg: 70, kg_per_week: -0.3 });
    expect(w).toContain('bajo_piso');
  });

  it('warns ritmo_agresivo when loss > 1% body weight/week', () => {
    // threshold: 60 × 0.01 = 0.6 kg/week; 0.7 exceeds it
    const w = safetyCheck({ target_kcal: 1600, sex: 'female', weight_kg: 60, kg_per_week: -0.7 });
    expect(w).toContain('ritmo_agresivo');
  });

  it('no warnings for healthy deficit', () => {
    const w = safetyCheck({ target_kcal: 1600, sex: 'female', weight_kg: 62, kg_per_week: -0.34 });
    expect(w).toHaveLength(0);
  });
});

describe('calculateEnergy (integration)', () => {
  it('female, moderate activity, −18% deficit → full result', () => {
    const r = calculateEnergy({
      sex: 'female',
      age: 28,
      weight_kg: 62,
      height_cm: 165,
      activity: 'moderate',
      adjustment_pct: -18,
      protein_multiplier: 2.0,
      fat_multiplier: 0.9,
    });
    expect(r.bmr).toBe(1350);
    expect(r.tdee).toBe(2093);
    expect(r.target_kcal).toBe(1716);
    expect(r.protein_g).toBe(124);
    expect(r.fat_g).toBe(56);
    expect(r.carbs_g).toBe(179);
    expect(Array.isArray(r.warnings)).toBe(true);
  });
});
