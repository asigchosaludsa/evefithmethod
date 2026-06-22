// lib/constants/exercises.ts
// Listas canónicas para categorías de ejercicio. Fuente de verdad de selects,
// chips de filtro, validación Zod y seeds. Mantener en sync con la migración 0011.

export const MUSCLE_GROUPS = [
  'Glúteos',
  'Cuádriceps',
  'Femoral',
  'Espalda',
  'Pecho',
  'Hombros',
  'Bíceps',
  'Tríceps',
  'Core',
  'Gemelos',
  'Cuerpo completo',
  'Cardio',
] as const;
export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export const EQUIPMENT = [
  'Barra',
  'Mancuernas',
  'Máquina',
  'Polea',
  'Peso corporal',
  'Banda elástica',
  'Kettlebell',
  'Smith',
  'Banco',
] as const;
export type Equipment = (typeof EQUIPMENT)[number];

export const DIFFICULTIES = ['principiante', 'intermedio', 'avanzado'] as const;
export type Difficulty = (typeof DIFFICULTIES)[number];

export const MOVEMENT_PATTERNS = [
  { value: 'empuje', label: 'Empuje' },
  { value: 'traccion', label: 'Tracción' },
  { value: 'dominante_cadera', label: 'Dominante de cadera' },
  { value: 'dominante_rodilla', label: 'Dominante de rodilla' },
  { value: 'core', label: 'Core' },
] as const;
export type MovementPattern = (typeof MOVEMENT_PATTERNS)[number]['value'];

export const DIFFICULTY_LABEL: Record<Difficulty, string> = {
  principiante: 'Principiante',
  intermedio: 'Intermedio',
  avanzado: 'Avanzado',
};

export const MOVEMENT_PATTERN_LABEL: Record<MovementPattern, string> = {
  empuje: 'Empuje',
  traccion: 'Tracción',
  dominante_cadera: 'Dominante de cadera',
  dominante_rodilla: 'Dominante de rodilla',
  core: 'Core',
};

/** Color de acento (hex) por grupo muscular para el ícono fallback de la tarjeta. */
export const MUSCLE_GROUP_COLOR: Record<string, string> = {
  'Glúteos': '#FF3B47',
  'Cuádriceps': '#F59E0B',
  'Femoral': '#F97316',
  'Espalda': '#3B82F6',
  'Pecho': '#8B5CF6',
  'Hombros': '#06B6D4',
  'Bíceps': '#10B981',
  'Tríceps': '#14B8A6',
  'Core': '#EAB308',
  'Gemelos': '#A855F7',
  'Cuerpo completo': '#EC4899',
  'Cardio': '#EF4444',
};

export function muscleGroupColor(mg: string | null | undefined): string {
  return (mg && MUSCLE_GROUP_COLOR[mg]) || '#64748B';
}
