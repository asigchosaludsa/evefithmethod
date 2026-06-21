export type TrendDirection = 'up' | 'down' | 'stable';

export interface Change {
  delta: number;
  direction: TrendDirection;
}

export interface WeightEntryInput {
  weight_kg: number;
  recorded_at: string; // YYYY-MM-DD
}

export interface WeightTrend {
  direction: TrendDirection;
  change: number;
}

export interface WeeklyProgressSummary {
  weightTrend: WeightTrend;
  workoutsCompleted: number;
  foodLogsCount: number;
}
