export interface WorkoutSetInput {
  reps_completed?: number | null;
  weight_kg?: number | null;
}

export interface CompletableSet {
  completed: boolean;
}
