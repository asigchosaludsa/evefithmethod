import { describe, expect, it } from 'vitest';
import {
  calculateFoodMacros,
  calculateMealTotals,
  calculateDailyNutritionTotals,
  calculateMacroProgress,
  generateMacroRescueSuggestion,
  calculateNutritionAdherence,
} from './calculations';

describe('calculateFoodMacros', () => {
  it('scales per 100g', () => {
    const f = { calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6 };
    expect(calculateFoodMacros(f, 200)).toEqual({
      calories: 330,
      protein_g: 62,
      carbs_g: 0,
      fat_g: 7.2,
    });
  });
  it('handles partial grams with 1-decimal rounding', () => {
    const f = { calories_per_100g: 89, protein_per_100g: 1.1, carbs_per_100g: 23, fat_per_100g: 0.3 };
    expect(calculateFoodMacros(f, 300)).toEqual({
      calories: 267,
      protein_g: 3.3,
      carbs_g: 69,
      fat_g: 0.9,
    });
  });
});

describe('calculateMealTotals / calculateDailyNutritionTotals', () => {
  const items = [
    { calories: 100, protein_g: 10, carbs_g: 5, fat_g: 2 },
    { calories: 50, protein_g: 4, carbs_g: 3, fat_g: 1 },
  ];
  it('sums items', () => {
    expect(calculateMealTotals(items)).toEqual({ calories: 150, protein_g: 14, carbs_g: 8, fat_g: 3 });
  });
  it('daily totals equal sum of all items', () => {
    expect(calculateDailyNutritionTotals(items)).toEqual(calculateMealTotals(items));
  });
  it('empty list is all zeros', () => {
    expect(calculateMealTotals([])).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 });
  });
});

describe('calculateMacroProgress', () => {
  it('returns pct + remaining', () => {
    expect(calculateMacroProgress(1420, 1800)).toEqual({
      consumed: 1420,
      target: 1800,
      remaining: 380,
      pct: 79,
    });
  });
  it('clamps remaining at 0 when over target', () => {
    expect(calculateMacroProgress(2000, 1800).remaining).toBe(0);
  });
  it('handles zero target', () => {
    expect(calculateMacroProgress(100, 0).pct).toBe(0);
  });
});

describe('generateMacroRescueSuggestion', () => {
  it('suggests protein foods when protein is short', () => {
    const s = generateMacroRescueSuggestion({ calories: 300, protein_g: 40, carbs_g: 5, fat_g: 5 });
    expect(s.focus).toBe('protein');
    expect(s.foods).toEqual(expect.arrayContaining(['Yogur griego', 'Pollo', 'Atún']));
  });
  it('suggests carbs when carbs are short', () => {
    const s = generateMacroRescueSuggestion({ calories: 300, protein_g: 5, carbs_g: 60, fat_g: 5 });
    expect(s.focus).toBe('carbs');
    expect(s.foods).toEqual(expect.arrayContaining(['Arroz', 'Banana']));
  });
  it('suggests fat when fat is short', () => {
    const s = generateMacroRescueSuggestion({ calories: 200, protein_g: 5, carbs_g: 5, fat_g: 25 });
    expect(s.focus).toBe('fat');
    expect(s.foods).toEqual(expect.arrayContaining(['Aguacate', 'Salmón']));
  });
  it('returns none when on track', () => {
    expect(generateMacroRescueSuggestion({ calories: 50, protein_g: 2, carbs_g: 2, fat_g: 1 }).focus).toBe('none');
  });
});

describe('calculateNutritionAdherence', () => {
  it('is 100 when consumed equals target', () => {
    expect(
      calculateNutritionAdherence({ calories: 1800, protein_g: 120 }, { calories: 1800, protein_g: 120 }).score,
    ).toBe(100);
  });
  it('is below 100 when under target', () => {
    const r = calculateNutritionAdherence({ calories: 900, protein_g: 60 }, { calories: 1800, protein_g: 120 });
    expect(r.score).toBe(50);
  });
});
