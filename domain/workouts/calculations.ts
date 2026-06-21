import type { CompletableSet, WorkoutSetInput } from './types';

const r1 = (n: number): number => Math.round((n + Number.EPSILON) * 10) / 10;

/** Total training volume = sum of reps * weight across completed sets. */
export function calculateWorkoutVolume(sets: WorkoutSetInput[]): number {
  let volume = 0;
  for (const s of sets) {
    if (s.reps_completed != null && s.weight_kg != null) {
      volume += s.reps_completed * s.weight_kg;
    }
  }
  return r1(volume);
}

/** Percentage of sets marked completed. */
export function calculateWorkoutCompletion(sets: CompletableSet[]): number {
  if (sets.length === 0) return 0;
  const done = sets.filter((s) => s.completed).length;
  return Math.round((done / sets.length) * 100);
}

/** Weekly adherence = completed / assigned workouts, capped at 100. */
export function calculateWeeklyWorkoutAdherence(completed: number, assigned: number): number {
  if (assigned <= 0) return 0;
  return Math.min(Math.round((completed / assigned) * 100), 100);
}

/** Estimated 1RM using the Epley formula. */
export function estimateOneRepMax(weight: number, reps: number): number {
  if (reps <= 1) return r1(weight);
  return r1(weight * (1 + reps / 30));
}
