import type { AlertSeverity, AlertSource } from '@/types/app';

/** A normalized, DB-agnostic alert produced by the rule engine. */
export interface DomainAlert {
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string;
  source: AlertSource;
}

export interface WeightPoint {
  weight_kg: number;
  recorded_at: string;
}

export type WeightGoal = 'loss' | 'gain' | 'maintenance';
