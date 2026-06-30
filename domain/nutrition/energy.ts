export type Sex = 'female' | 'male';

export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active';

export type EnergyWarning = 'bajo_piso' | 'ritmo_agresivo';

export interface BMRParams {
  sex: Sex;
  age: number;
  weight_kg: number;
  height_cm: number;
  bodyfat_pct?: number;
}

export interface BMRResult {
  bmr: number;
  formula: 'mifflin' | 'katch';
}

export interface GoalResult {
  target_kcal: number;
  kg_per_week: number;
}

export interface MacroResult {
  protein_g: number;
  fat_g: number;
  carbs_g: number;
}

export interface EnergyInput extends BMRParams {
  activity: ActivityLevel;
  adjustment_pct: number;
  protein_multiplier: number;
  fat_multiplier: number;
}

export interface EnergyResult extends BMRResult, GoalResult, MacroResult {
  tdee: number;
  adjustment_pct: number;
  warnings: EnergyWarning[];
}

const ACTIVITY_FACTORS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
};

const KCAL_PER_KG = 7700;
const FLOOR_FEMALE = 1200;
const FLOOR_MALE = 1500;
const MAX_RATE_FRACTION = 0.01;

/** Mifflin-St Jeor (default) or Katch-McArdle if bodyfat_pct is supplied. */
export function calculateBMR(params: BMRParams): BMRResult {
  const { sex, weight_kg, height_cm, age, bodyfat_pct } = params;
  if (bodyfat_pct !== undefined) {
    const lean = weight_kg * (1 - bodyfat_pct / 100);
    return { bmr: Math.round(370 + 21.6 * lean), formula: 'katch' };
  }
  const constant = sex === 'female' ? -161 : 5;
  return {
    bmr: Math.round(10 * weight_kg + 6.25 * height_cm - 5 * age + constant),
    formula: 'mifflin',
  };
}

/** TDEE = BMR × activity factor (Harris-Benedict levels). */
export function calculateTDEE(bmr: number, activity: ActivityLevel): number {
  return Math.round(bmr * ACTIVITY_FACTORS[activity]);
}

/** Applies a % adjustment to TDEE and returns daily target + weekly rate of change. */
export function applyGoalAdjustment(tdee: number, adjustment_pct: number): GoalResult {
  const target_kcal = Math.round(tdee * (1 + adjustment_pct / 100));
  const deficit_day = tdee - target_kcal;
  const kg_per_week = parseFloat((-(deficit_day * 7) / KCAL_PER_KG).toFixed(2));
  return { target_kcal, kg_per_week };
}

/** Protein first, fat second, carbs residual. All values in grams. */
export function calculateMacros(params: {
  target_kcal: number;
  weight_kg: number;
  protein_multiplier: number;
  fat_multiplier: number;
}): MacroResult {
  const { target_kcal, weight_kg, protein_multiplier, fat_multiplier } = params;
  const protein_g = Math.round(protein_multiplier * weight_kg);
  const fat_g = Math.round(fat_multiplier * weight_kg);
  const residual = target_kcal - protein_g * 4 - fat_g * 9;
  const carbs_g = Math.max(0, Math.round(residual / 4));
  return { protein_g, fat_g, carbs_g };
}

/** Returns warning codes for unsafe intake or overly aggressive rate of change. */
export function safetyCheck(params: {
  target_kcal: number;
  sex: Sex;
  weight_kg: number;
  kg_per_week: number;
}): EnergyWarning[] {
  const { target_kcal, sex, weight_kg, kg_per_week } = params;
  const warnings: EnergyWarning[] = [];
  const floor = sex === 'female' ? FLOOR_FEMALE : FLOOR_MALE;
  if (target_kcal < floor) warnings.push('bajo_piso');
  if (Math.abs(kg_per_week) > weight_kg * MAX_RATE_FRACTION) warnings.push('ritmo_agresivo');
  return warnings;
}

/** Full pipeline: BMR → TDEE → goal adjustment → macros → safety check. */
export function calculateEnergy(input: EnergyInput): EnergyResult {
  const bmrResult = calculateBMR(input);
  const tdee = calculateTDEE(bmrResult.bmr, input.activity);
  const { target_kcal, kg_per_week } = applyGoalAdjustment(tdee, input.adjustment_pct);
  const macros = calculateMacros({
    target_kcal,
    weight_kg: input.weight_kg,
    protein_multiplier: input.protein_multiplier,
    fat_multiplier: input.fat_multiplier,
  });
  const warnings = safetyCheck({
    target_kcal,
    sex: input.sex,
    weight_kg: input.weight_kg,
    kg_per_week,
  });
  return {
    ...bmrResult,
    tdee,
    target_kcal,
    kg_per_week,
    adjustment_pct: input.adjustment_pct,
    ...macros,
    warnings,
  };
}
