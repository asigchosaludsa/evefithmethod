// domain/nutrition/units.ts
/** Unidades de registro de comida. 'g' y 'ml' se cuentan 1:1 a gramos; 'unit' usa grams_per_unit. */
export type FoodUnit = 'g' | 'ml' | 'unit';

export function toGrams(quantity: number, unit: FoodUnit, gramsPerUnit: number | null): number {
  if (unit === 'unit') {
    if (gramsPerUnit == null || gramsPerUnit <= 0) return 0;
    return quantity * gramsPerUnit;
  }
  return quantity; // g y ml -> 1:1
}

export function availableUnits(food: { grams_per_unit: number | null }): FoodUnit[] {
  return food.grams_per_unit != null && food.grams_per_unit > 0 ? ['g', 'ml', 'unit'] : ['g', 'ml'];
}

export function formatQuantity(quantity: number, unit: FoodUnit, unitLabel: string | null): string {
  if (unit === 'unit') {
    const label = unitLabel ?? 'unidad';
    return `${quantity} ${label}${quantity === 1 ? '' : 's'}`;
  }
  return `${quantity} ${unit}`;
}
