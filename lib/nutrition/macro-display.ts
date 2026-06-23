/**
 * Sistema compartido de presentación de macros (colores + etiquetas).
 *
 * Estandariza el código de color de los tres macronutrientes en toda la app:
 *   - Proteína       → info (azul)
 *   - Carbohidratos  → warning (ámbar)
 *   - Grasa          → success (verde)
 *
 * Coincide con las barras de `MacroProgress`. Usa SIEMPRE estos tonos (vía las
 * utilidades `text-info` / `text-warning` / `text-success`, nunca hex crudo)
 * para que "P / C / G" sea consistente y legible en todas las vistas.
 */

import type { Macros } from '@/types/app';

export type MacroTone = 'info' | 'warning' | 'success';

export interface MacroDescriptor {
  /** Clave del macro en el objeto `Macros` (gramos). */
  key: 'protein_g' | 'carbs_g' | 'fat_g';
  /** Nombre completo para leyendas/tooltips. */
  label: string;
  /** Abreviatura (P / C / G). */
  short: string;
  /** Tono semántico del sistema de diseño. */
  tone: MacroTone;
  /** Clase de texto Tailwind para el tono. */
  textClass: string;
  /** Variable CSS del color (para SVG / estilos inline). */
  colorVar: string;
}

/** Mapa tono → clase de texto del sistema de diseño. */
const TONE_TEXT_CLASS: Record<MacroTone, string> = {
  info: 'text-info',
  warning: 'text-warning',
  success: 'text-success',
};

/** Mapa tono → variable CSS del color del sistema de diseño. */
const TONE_COLOR_VAR: Record<MacroTone, string> = {
  info: 'var(--color-info)',
  warning: 'var(--color-warning)',
  success: 'var(--color-success)',
};

/**
 * Orden canónico de los macros: Proteína, Carbohidratos, Grasa.
 * Es la única fuente de verdad para etiquetas, abreviaturas y colores.
 */
export const MACROS: readonly MacroDescriptor[] = [
  {
    key: 'protein_g',
    label: 'Proteína',
    short: 'P',
    tone: 'info',
    textClass: TONE_TEXT_CLASS.info,
    colorVar: TONE_COLOR_VAR.info,
  },
  {
    key: 'carbs_g',
    label: 'Carbohidratos',
    short: 'C',
    tone: 'warning',
    textClass: TONE_TEXT_CLASS.warning,
    colorVar: TONE_COLOR_VAR.warning,
  },
  {
    key: 'fat_g',
    label: 'Grasa',
    short: 'G',
    tone: 'success',
    textClass: TONE_TEXT_CLASS.success,
    colorVar: TONE_COLOR_VAR.success,
  },
] as const;

/** Clase de texto para un macro concreto (atajo). */
export function macroTextClass(key: MacroDescriptor['key']): string {
  return MACROS.find((m) => m.key === key)?.textClass ?? 'text-foreground';
}

/** Acceso seguro al valor de un macro dentro de un objeto `Macros` (parcial). */
export function macroValue(consumed: Partial<Macros>, key: MacroDescriptor['key']): number {
  return consumed[key] ?? 0;
}
