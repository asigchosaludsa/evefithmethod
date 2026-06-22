// domain/workouts/splits.ts
import { SPLIT_TEMPLATES } from '@/lib/constants/splits';

export interface GeneratedDay {
  day_number: number;
  title: string;
  focus: string;
}

/** Devuelve los días a crear para un split. [] para 'personalizado' o desconocido. */
export function resolveSplitDays(splitType: string): GeneratedDay[] {
  if (splitType === 'personalizado') return [];
  const tpl = SPLIT_TEMPLATES[splitType as keyof typeof SPLIT_TEMPLATES];
  if (!tpl) return [];
  return tpl.days.map((d, i) => ({ day_number: i + 1, title: d.title, focus: d.focus }));
}
