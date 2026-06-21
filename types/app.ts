/** Shared domain enums/unions used across the app and DB layer. */

export type Role = 'coach' | 'student' | 'admin';
export type AccountStatus = 'active' | 'inactive' | 'pending';
export type RelationshipStatus = 'active' | 'paused' | 'completed' | 'cancelled';
export type InvitationStatus = 'pending' | 'accepted' | 'expired' | 'cancelled';
export type PlanStatus = 'draft' | 'active' | 'archived';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'other';
export type ReviewStatus = 'pending' | 'reviewed' | 'flagged';
export type FoodRecommendationType = 'recommended' | 'limited';
export type ExerciseStatus = 'draft' | 'published' | 'archived';
export type WorkoutLogStatus = 'started' | 'completed' | 'skipped';
export type PhotoType = 'front' | 'side' | 'back' | 'other';
export type PhotoVisibility = 'student_and_coach' | 'coach_only' | 'student_only';
export type ContentStatus = 'draft' | 'published' | 'archived';
export type AlertSeverity = 'info' | 'warning' | 'critical' | 'success';
export type AlertStatus = 'open' | 'resolved' | 'dismissed';
export type AlertSource = 'system' | 'coach';

export const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];
export const CONTENT_CATEGORIES = [
  'Nutrición',
  'Técnica',
  'Organización',
  'Motivación',
  'Recuperación',
  'Errores comunes',
] as const;
export type ContentCategory = (typeof CONTENT_CATEGORIES)[number];

/** A nutrition macro tuple used throughout the nutrition domain. */
export interface Macros {
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
}
