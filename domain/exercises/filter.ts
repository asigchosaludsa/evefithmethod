// domain/exercises/filter.ts
export interface FilterableExercise {
  id: string;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  difficulty: string | null;
  movement_pattern: string | null;
}

export interface ExerciseFilters {
  query?: string;
  muscleGroups?: string[];
  equipment?: string[];
  difficulty?: string[];
  movementPattern?: string[];
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

function matches(value: string | null, selected?: string[]): boolean {
  if (!selected || selected.length === 0) return true;
  return value != null && selected.includes(value);
}

export function filterExercises<T extends FilterableExercise>(
  exercises: T[],
  filters: ExerciseFilters,
): T[] {
  const q = filters.query ? normalize(filters.query.trim()) : '';
  return exercises.filter((e) => {
    if (q) {
      const haystack = normalize([e.name, e.muscle_group, e.equipment].filter(Boolean).join(' '));
      if (!haystack.includes(q)) return false;
    }
    if (!matches(e.muscle_group, filters.muscleGroups)) return false;
    if (!matches(e.equipment, filters.equipment)) return false;
    if (!matches(e.difficulty, filters.difficulty)) return false;
    if (!matches(e.movement_pattern, filters.movementPattern)) return false;
    return true;
  });
}
