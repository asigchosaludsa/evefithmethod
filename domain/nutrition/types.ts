import type { Macros } from '@/types/app';

export type { Macros };

export interface FoodMacroSource {
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

export interface MacroProgress {
  consumed: number;
  target: number;
  remaining: number;
  pct: number;
}

export type RescueFocus = 'protein' | 'carbs' | 'fat' | 'general' | 'none';

export interface MacroRescueSuggestion {
  focus: RescueFocus;
  foods: string[];
  message: string;
}
