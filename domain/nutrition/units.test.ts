// domain/nutrition/units.test.ts
import { describe, it, expect } from 'vitest';
import { toGrams, availableUnits, formatQuantity } from './units';

describe('toGrams', () => {
  it('gramos y ml se cuentan 1:1', () => {
    expect(toGrams(150, 'g', null)).toBe(150);
    expect(toGrams(200, 'ml', null)).toBe(200);
  });
  it('unidad multiplica por gramos por unidad', () => {
    expect(toGrams(2, 'unit', 50)).toBe(100);
  });
  it('unidad sin gramos/unidad devuelve 0', () => {
    expect(toGrams(2, 'unit', null)).toBe(0);
  });
});

describe('availableUnits', () => {
  it('incluye unidad solo si hay grams_per_unit', () => {
    expect(availableUnits({ grams_per_unit: 50 })).toEqual(['g', 'ml', 'unit']);
    expect(availableUnits({ grams_per_unit: null })).toEqual(['g', 'ml']);
  });
});

describe('formatQuantity', () => {
  it('formatea unidades con etiqueta y plural simple', () => {
    expect(formatQuantity(2, 'unit', 'huevo')).toBe('2 huevos');
    expect(formatQuantity(1, 'unit', 'huevo')).toBe('1 huevo');
  });
  it('formatea g y ml', () => {
    expect(formatQuantity(150, 'g', null)).toBe('150 g');
    expect(formatQuantity(200, 'ml', null)).toBe('200 ml');
  });
});
