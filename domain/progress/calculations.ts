import type {
  Change,
  TrendDirection,
  WeeklyProgressSummary,
  WeightEntryInput,
  WeightTrend,
} from './types';

const r1 = (n: number): number => Math.round((n + Number.EPSILON) * 10) / 10;

function directionOf(delta: number): TrendDirection {
  if (delta < 0) return 'down';
  if (delta > 0) return 'up';
  return 'stable';
}

/** Difference between the current and a previous value. */
export function calculateWeightChange(current: number, previous: number): Change {
  const delta = r1(current - previous);
  return { delta, direction: directionOf(delta) };
}

/** Trend across a set of weight entries (first vs last by date). */
export function calculateWeeklyWeightTrend(entries: WeightEntryInput[]): WeightTrend {
  if (entries.length < 2) return { direction: 'stable', change: 0 };
  const sorted = [...entries].sort((a, b) => a.recorded_at.localeCompare(b.recorded_at));
  const first = sorted[0]!;
  const last = sorted[sorted.length - 1]!;
  const change = r1(last.weight_kg - first.weight_kg);
  return { direction: directionOf(change), change };
}

/** Body-measurement change (same shape as weight change). */
export function calculateMeasurementChange(current: number, previous: number): Change {
  const delta = r1(current - previous);
  return { delta, direction: directionOf(delta) };
}

/** Compose a simple weekly summary for the student dashboard. */
export function buildWeeklyProgressSummary(input: {
  weights: WeightEntryInput[];
  workoutsCompleted: number;
  foodLogsCount: number;
}): WeeklyProgressSummary {
  return {
    weightTrend: calculateWeeklyWeightTrend(input.weights),
    workoutsCompleted: input.workoutsCompleted,
    foodLogsCount: input.foodLogsCount,
  };
}
