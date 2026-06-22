// lib/constants/splits.ts
// Plantillas de split: cada una define los días que se generan al crear un plan.
// `muscleGroups` (valores canónicos de MUSCLE_GROUPS) alimenta el pre-filtro del catálogo.

import type { MuscleGroup } from './exercises';

export interface SplitDayTemplate {
  title: string;
  focus: string;
  muscleGroups: MuscleGroup[];
}

export interface SplitTemplate {
  label: string;
  english: string;
  days: SplitDayTemplate[];
}

const PUSH: MuscleGroup[] = ['Pecho', 'Hombros', 'Tríceps'];
const PULL: MuscleGroup[] = ['Espalda', 'Bíceps'];
const LEGS: MuscleGroup[] = ['Cuádriceps', 'Femoral', 'Glúteos', 'Gemelos'];
const UPPER: MuscleGroup[] = ['Pecho', 'Espalda', 'Hombros', 'Bíceps', 'Tríceps'];
const LIMBS: MuscleGroup[] = ['Bíceps', 'Tríceps', 'Cuádriceps', 'Femoral', 'Gemelos'];
const FULL: MuscleGroup[] = [];

const d = (title: string, focus: string, muscleGroups: MuscleGroup[]): SplitDayTemplate => ({
  title,
  focus,
  muscleGroups,
});

export const SPLIT_TEMPLATES = {
  cuerpo_completo: {
    label: 'Cuerpo completo',
    english: 'Full Body',
    days: [
      d('Cuerpo completo', 'Todo el cuerpo', FULL),
      d('Cuerpo completo', 'Todo el cuerpo', FULL),
      d('Cuerpo completo', 'Todo el cuerpo', FULL),
    ],
  },
  torso_pierna: {
    label: 'Torso / Pierna',
    english: 'Upper / Lower',
    days: [
      d('Torso', 'Tren superior', UPPER),
      d('Pierna', 'Tren inferior', LEGS),
      d('Torso', 'Tren superior', UPPER),
      d('Pierna', 'Tren inferior', LEGS),
    ],
  },
  ppl: {
    label: 'Empuje / Tracción / Pierna',
    english: 'PPL',
    days: [d('Empuje', 'Pecho · Hombros · Tríceps', PUSH), d('Tracción', 'Espalda · Bíceps', PULL), d('Pierna', 'Tren inferior', LEGS)],
  },
  ppl_doble: {
    label: 'PPL doble',
    english: 'PPL 6 días',
    days: [
      d('Empuje', 'Pecho · Hombros · Tríceps', PUSH),
      d('Tracción', 'Espalda · Bíceps', PULL),
      d('Pierna', 'Tren inferior', LEGS),
      d('Empuje', 'Pecho · Hombros · Tríceps', PUSH),
      d('Tracción', 'Espalda · Bíceps', PULL),
      d('Pierna', 'Tren inferior', LEGS),
    ],
  },
  bro_split: {
    label: 'Por grupo muscular',
    english: 'Bro Split',
    days: [
      d('Pecho', 'Pecho', ['Pecho']),
      d('Espalda', 'Espalda', ['Espalda']),
      d('Pierna', 'Tren inferior', LEGS),
      d('Hombros', 'Hombros', ['Hombros']),
      d('Brazos', 'Bíceps · Tríceps', ['Bíceps', 'Tríceps']),
    ],
  },
  torso_extremidades: {
    label: 'Torso / Extremidades',
    english: 'Torso / Limbs',
    days: [
      d('Torso', 'Pecho · Espalda · Hombros', ['Pecho', 'Espalda', 'Hombros']),
      d('Extremidades', 'Brazos y piernas', LIMBS),
      d('Torso', 'Pecho · Espalda · Hombros', ['Pecho', 'Espalda', 'Hombros']),
      d('Extremidades', 'Brazos y piernas', LIMBS),
    ],
  },
  ppl_ul: {
    label: 'PPL + Torso/Pierna',
    english: 'PPL + UL',
    days: [
      d('Empuje', 'Pecho · Hombros · Tríceps', PUSH),
      d('Tracción', 'Espalda · Bíceps', PULL),
      d('Pierna', 'Tren inferior', LEGS),
      d('Torso', 'Tren superior', UPPER),
      d('Pierna', 'Tren inferior', LEGS),
    ],
  },
  arnold: {
    label: 'Arnold',
    english: 'Arnold Split',
    days: [
      d('Pecho y Espalda', 'Pecho · Espalda', ['Pecho', 'Espalda']),
      d('Hombros y Brazos', 'Hombros · Bíceps · Tríceps', ['Hombros', 'Bíceps', 'Tríceps']),
      d('Pierna', 'Tren inferior', LEGS),
      d('Pecho y Espalda', 'Pecho · Espalda', ['Pecho', 'Espalda']),
      d('Hombros y Brazos', 'Hombros · Bíceps · Tríceps', ['Hombros', 'Bíceps', 'Tríceps']),
      d('Pierna', 'Tren inferior', LEGS),
    ],
  },
  phul: {
    label: 'Fuerza-Hipertrofia T/P (PHUL)',
    english: 'PHUL',
    days: [
      d('Torso · fuerza', 'Tren superior pesado', UPPER),
      d('Pierna · fuerza', 'Tren inferior pesado', LEGS),
      d('Torso · hipertrofia', 'Tren superior volumen', UPPER),
      d('Pierna · hipertrofia', 'Tren inferior volumen', LEGS),
    ],
  },
  phat: {
    label: 'Powerbuilding (PHAT)',
    english: 'PHAT',
    days: [
      d('Torso · fuerza', 'Tren superior pesado', UPPER),
      d('Pierna · fuerza', 'Tren inferior pesado', LEGS),
      d('Espalda y Hombros · hipertrofia', 'Espalda · Hombros', ['Espalda', 'Hombros']),
      d('Pierna · hipertrofia', 'Tren inferior volumen', LEGS),
      d('Pecho y Brazos · hipertrofia', 'Pecho · Bíceps · Tríceps', ['Pecho', 'Bíceps', 'Tríceps']),
    ],
  },
  ppl_arnold: {
    label: 'PPL + Arnold',
    english: 'híbrido',
    days: [
      d('Empuje', 'Pecho · Hombros · Tríceps', PUSH),
      d('Tracción', 'Espalda · Bíceps', PULL),
      d('Pierna', 'Tren inferior', LEGS),
      d('Pecho y Espalda', 'Pecho · Espalda', ['Pecho', 'Espalda']),
      d('Hombros y Brazos', 'Hombros · Bíceps · Tríceps', ['Hombros', 'Bíceps', 'Tríceps']),
      d('Pierna', 'Tren inferior', LEGS),
    ],
  },
} as const;

export type SplitType = keyof typeof SPLIT_TEMPLATES | 'personalizado';

export const SPLIT_KEYS = Object.keys(SPLIT_TEMPLATES) as (keyof typeof SPLIT_TEMPLATES)[];

/** Lista para selectores UI (incluye Personalizado al final). */
export const SPLIT_OPTIONS: { value: SplitType; label: string; english: string; dayCount: number }[] = [
  ...SPLIT_KEYS.map((k) => ({
    value: k as SplitType,
    label: SPLIT_TEMPLATES[k].label,
    english: SPLIT_TEMPLATES[k].english,
    dayCount: SPLIT_TEMPLATES[k].days.length,
  })),
  { value: 'personalizado', label: 'Personalizado', english: 'tú decides', dayCount: 0 },
];

export function splitLabel(value: string | null | undefined): string | null {
  if (!value) return null;
  if (value === 'personalizado') return 'Personalizado';
  return SPLIT_TEMPLATES[value as keyof typeof SPLIT_TEMPLATES]?.label ?? null;
}
