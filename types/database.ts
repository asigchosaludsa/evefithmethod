/**
 * Hand-written Supabase Database type for EveFit Method.
 * MUST stay in sync with supabase/migrations/*. Can later be regenerated with
 * `supabase gen types typescript --project-id <ref> > types/database.generated.ts`.
 */
import type {
  AccountStatus,
  AlertSeverity,
  AlertSource,
  AlertStatus,
  ContentStatus,
  Difficulty,
  ExerciseStatus,
  FoodRecommendationType,
  InvitationStatus,
  MealType,
  MovementPattern,
  PhotoType,
  PhotoVisibility,
  PlanStatus,
  RelationshipStatus,
  ReviewStatus,
  Role,
  SplitType,
  WorkoutLogStatus,
} from './app';

type Timestamp = string;
type DateString = string;

// ---------------------------------------------------------------------------
// profiles
type ProfilesRow = {
  id: string;
  role: Role | null;
  full_name: string | null;
  email: string | null;
  phone: string | null;
  avatar_url: string | null;
  status: AccountStatus;
  email_confirmed_at: Timestamp | null;
  onboarding_completed: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type ProfilesInsert = {
  id: string;
  role?: Role | null;
  full_name?: string | null;
  email?: string | null;
  phone?: string | null;
  avatar_url?: string | null;
  status?: AccountStatus;
  email_confirmed_at?: Timestamp | null;
  onboarding_completed?: boolean;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// coach_profiles
type CoachProfilesRow = {
  id: string;
  user_id: string;
  business_name: string | null;
  bio: string | null;
  timezone: string;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type CoachProfilesInsert = {
  id?: string;
  user_id: string;
  business_name?: string | null;
  bio?: string | null;
  timezone?: string;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// student_profiles
type StudentProfilesRow = {
  id: string;
  user_id: string;
  date_of_birth: DateString | null;
  age: number | null;
  height_cm: number | null;
  initial_weight_kg: number | null;
  current_weight_kg: number | null;
  goal: string | null;
  training_level: string | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type StudentProfilesInsert = {
  id?: string;
  user_id: string;
  date_of_birth?: DateString | null;
  age?: number | null;
  height_cm?: number | null;
  initial_weight_kg?: number | null;
  current_weight_kg?: number | null;
  goal?: string | null;
  training_level?: string | null;
  notes?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// coach_students
type CoachStudentsRow = {
  id: string;
  coach_id: string;
  student_id: string;
  status: RelationshipStatus;
  started_at: DateString | null;
  ended_at: DateString | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type CoachStudentsInsert = {
  id?: string;
  coach_id: string;
  student_id: string;
  status?: RelationshipStatus;
  started_at?: DateString | null;
  ended_at?: DateString | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// invitations
type InvitationsRow = {
  id: string;
  coach_id: string;
  email: string;
  role: Extract<Role, 'student' | 'coach'>;
  student_name: string | null;
  goal: string | null;
  message: string | null;
  token_hash: string;
  status: InvitationStatus;
  expires_at: Timestamp | null;
  accepted_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type InvitationsInsert = {
  id?: string;
  coach_id: string;
  email: string;
  role?: Extract<Role, 'student' | 'coach'>;
  student_name?: string | null;
  goal?: string | null;
  message?: string | null;
  token_hash: string;
  status?: InvitationStatus;
  expires_at?: Timestamp | null;
  accepted_at?: Timestamp | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// nutrition_plans
type NutritionPlansRow = {
  id: string;
  coach_id: string;
  student_id: string;
  title: string;
  calories_target: number | null;
  protein_target_g: number | null;
  carbs_target_g: number | null;
  fat_target_g: number | null;
  meals_per_day: number | null;
  notes: string | null;
  status: PlanStatus;
  starts_at: DateString | null;
  ends_at: DateString | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type NutritionPlansInsert = {
  id?: string;
  coach_id: string;
  student_id: string;
  title: string;
  calories_target?: number | null;
  protein_target_g?: number | null;
  carbs_target_g?: number | null;
  fat_target_g?: number | null;
  meals_per_day?: number | null;
  notes?: string | null;
  status?: PlanStatus;
  starts_at?: DateString | null;
  ends_at?: DateString | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// nutrition_plan_food_recommendations
type NutritionRecRow = {
  id: string;
  nutrition_plan_id: string;
  type: FoodRecommendationType;
  food_name: string;
  notes: string | null;
  created_at: Timestamp;
};
type NutritionRecInsert = {
  id?: string;
  nutrition_plan_id: string;
  type: FoodRecommendationType;
  food_name: string;
  notes?: string | null;
  created_at?: Timestamp;
};

// food_items
type FoodItemsRow = {
  id: string;
  name: string;
  brand: string | null;
  serving_unit: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  grams_per_unit: number | null;
  unit_label: string | null;
  source: string;
  created_by: string | null;
  is_public: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type FoodItemsInsert = {
  id?: string;
  name: string;
  brand?: string | null;
  serving_unit?: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  grams_per_unit?: number | null;
  unit_label?: string | null;
  source?: string;
  created_by?: string | null;
  is_public?: boolean;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// food_logs
type FoodLogsRow = {
  id: string;
  student_id: string;
  coach_id: string | null;
  nutrition_plan_id: string | null;
  meal_type: MealType;
  logged_at: Timestamp;
  notes: string | null;
  photo_path: string | null;
  coach_review_status: ReviewStatus;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type FoodLogsInsert = {
  id?: string;
  student_id: string;
  coach_id?: string | null;
  nutrition_plan_id?: string | null;
  meal_type: MealType;
  logged_at: Timestamp;
  notes?: string | null;
  photo_path?: string | null;
  coach_review_status?: ReviewStatus;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// food_log_items
type FoodLogItemsRow = {
  id: string;
  food_log_id: string;
  food_item_id: string | null;
  unit: string | null;
  quantity: number | null;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at: Timestamp;
};
type FoodLogItemsInsert = {
  id?: string;
  food_log_id: string;
  food_item_id?: string | null;
  unit?: string | null;
  quantity?: number | null;
  grams: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  created_at?: Timestamp;
};

// workout_plans
type WorkoutPlansRow = {
  id: string;
  coach_id: string;
  student_id: string;
  title: string;
  focus: string | null;
  level: string | null;
  split_type: SplitType | null;
  weeks: number | null;
  estimated_duration_minutes: number | null;
  status: PlanStatus;
  starts_at: DateString | null;
  ends_at: DateString | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type WorkoutPlansInsert = {
  id?: string;
  coach_id: string;
  student_id: string;
  title: string;
  focus?: string | null;
  level?: string | null;
  split_type?: SplitType | null;
  weeks?: number | null;
  estimated_duration_minutes?: number | null;
  status?: PlanStatus;
  starts_at?: DateString | null;
  ends_at?: DateString | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// workout_plan_days
type WorkoutPlanDaysRow = {
  id: string;
  workout_plan_id: string;
  day_number: number;
  title: string;
  focus: string | null;
  weekday: number | null;
  notes: string | null;
  created_at: Timestamp;
};
type WorkoutPlanDaysInsert = {
  id?: string;
  workout_plan_id: string;
  day_number: number;
  title: string;
  focus?: string | null;
  weekday?: number | null;
  notes?: string | null;
  created_at?: Timestamp;
};

// exercises
type ExercisesRow = {
  id: string;
  coach_id: string | null;
  name: string;
  muscle_group: string | null;
  equipment: string | null;
  difficulty: Difficulty | null;
  movement_pattern: MovementPattern | null;
  description: string | null;
  instructions: string | null;
  common_mistakes: string | null;
  video_url: string | null;
  thumbnail_url: string | null;
  status: ExerciseStatus;
  is_global: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type ExercisesInsert = {
  id?: string;
  coach_id?: string | null;
  name: string;
  muscle_group?: string | null;
  equipment?: string | null;
  difficulty?: Difficulty | null;
  movement_pattern?: MovementPattern | null;
  description?: string | null;
  instructions?: string | null;
  common_mistakes?: string | null;
  video_url?: string | null;
  thumbnail_url?: string | null;
  status?: ExerciseStatus;
  is_global?: boolean;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// workout_plan_exercises
type WorkoutPlanExercisesRow = {
  id: string;
  workout_plan_day_id: string;
  exercise_id: string | null;
  sort_order: number;
  sets: number;
  reps: string;
  rest_seconds: number | null;
  tempo: string | null;
  suggested_weight_kg: number | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type WorkoutPlanExercisesInsert = {
  id?: string;
  workout_plan_day_id: string;
  exercise_id?: string | null;
  sort_order: number;
  sets: number;
  reps: string;
  rest_seconds?: number | null;
  tempo?: string | null;
  suggested_weight_kg?: number | null;
  notes?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// workout_logs
type WorkoutLogsRow = {
  id: string;
  student_id: string;
  coach_id: string | null;
  workout_plan_id: string | null;
  workout_plan_day_id: string | null;
  session_date: DateString | null;
  logged_at: Timestamp;
  status: WorkoutLogStatus;
  perceived_effort: number | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type WorkoutLogsInsert = {
  id?: string;
  student_id: string;
  coach_id?: string | null;
  workout_plan_id?: string | null;
  workout_plan_day_id?: string | null;
  session_date?: DateString | null;
  logged_at: Timestamp;
  status?: WorkoutLogStatus;
  perceived_effort?: number | null;
  notes?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// workout_log_sets
type WorkoutLogSetsRow = {
  id: string;
  workout_log_id: string;
  exercise_id: string | null;
  set_number: number;
  reps_completed: number | null;
  weight_kg: number | null;
  completed: boolean;
  notes: string | null;
  created_at: Timestamp;
};
type WorkoutLogSetsInsert = {
  id?: string;
  workout_log_id: string;
  exercise_id?: string | null;
  set_number: number;
  reps_completed?: number | null;
  weight_kg?: number | null;
  completed?: boolean;
  notes?: string | null;
  created_at?: Timestamp;
};

// weight_entries
type WeightEntriesRow = {
  id: string;
  student_id: string;
  coach_id: string | null;
  weight_kg: number;
  recorded_at: DateString;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type WeightEntriesInsert = {
  id?: string;
  student_id: string;
  coach_id?: string | null;
  weight_kg: number;
  recorded_at: DateString;
  notes?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// body_measurements
type BodyMeasurementsRow = {
  id: string;
  student_id: string;
  coach_id: string | null;
  recorded_at: DateString;
  waist_cm: number | null;
  hip_cm: number | null;
  chest_cm: number | null;
  thigh_cm: number | null;
  arm_cm: number | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type BodyMeasurementsInsert = {
  id?: string;
  student_id: string;
  coach_id?: string | null;
  recorded_at: DateString;
  waist_cm?: number | null;
  hip_cm?: number | null;
  chest_cm?: number | null;
  thigh_cm?: number | null;
  arm_cm?: number | null;
  notes?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// progress_photos
type ProgressPhotosRow = {
  id: string;
  student_id: string;
  coach_id: string | null;
  photo_path: string;
  photo_type: PhotoType;
  recorded_at: DateString | null;
  visibility: PhotoVisibility;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type ProgressPhotosInsert = {
  id?: string;
  student_id: string;
  coach_id?: string | null;
  photo_path: string;
  photo_type?: PhotoType;
  recorded_at?: DateString | null;
  visibility?: PhotoVisibility;
  notes?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// content_posts
type ContentPostsRow = {
  id: string;
  coach_id: string;
  title: string;
  category: string | null;
  summary: string | null;
  body: string | null;
  status: ContentStatus;
  published_at: Timestamp | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type ContentPostsInsert = {
  id?: string;
  coach_id: string;
  title: string;
  category?: string | null;
  summary?: string | null;
  body?: string | null;
  status?: ContentStatus;
  published_at?: Timestamp | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// content_assignments
type ContentAssignmentsRow = {
  id: string;
  content_post_id: string;
  student_id: string;
  coach_id: string;
  assigned_at: Timestamp;
  read_at: Timestamp | null;
  created_at: Timestamp;
};
type ContentAssignmentsInsert = {
  id?: string;
  content_post_id: string;
  student_id: string;
  coach_id: string;
  assigned_at?: Timestamp;
  read_at?: Timestamp | null;
  created_at?: Timestamp;
};

// coach_notes
type CoachNotesRow = {
  id: string;
  coach_id: string;
  student_id: string;
  note: string;
  category: string | null;
  is_private: boolean;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type CoachNotesInsert = {
  id?: string;
  coach_id: string;
  student_id: string;
  note: string;
  category?: string | null;
  is_private?: boolean;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// student_checkins
type StudentCheckinsRow = {
  id: string;
  student_id: string;
  coach_id: string | null;
  checkin_date: DateString;
  energy_level: number | null;
  hunger_level: number | null;
  sleep_quality: number | null;
  stress_level: number | null;
  soreness_level: number | null;
  notes: string | null;
  created_at: Timestamp;
  updated_at: Timestamp;
};
type StudentCheckinsInsert = {
  id?: string;
  student_id: string;
  coach_id?: string | null;
  checkin_date: DateString;
  energy_level?: number | null;
  hunger_level?: number | null;
  sleep_quality?: number | null;
  stress_level?: number | null;
  soreness_level?: number | null;
  notes?: string | null;
  created_at?: Timestamp;
  updated_at?: Timestamp;
};

// alerts
type AlertsRow = {
  id: string;
  coach_id: string;
  student_id: string;
  type: string;
  severity: AlertSeverity;
  title: string;
  message: string | null;
  status: AlertStatus;
  source: AlertSource;
  created_at: Timestamp;
  resolved_at: Timestamp | null;
};
type AlertsInsert = {
  id?: string;
  coach_id: string;
  student_id: string;
  type: string;
  severity?: AlertSeverity;
  title: string;
  message?: string | null;
  status?: AlertStatus;
  source?: AlertSource;
  created_at?: Timestamp;
  resolved_at?: Timestamp | null;
};

// auth_events
type AuthEventsRow = {
  id: string;
  user_id: string | null;
  event_type: string;
  provider: string | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: Timestamp;
};
type AuthEventsInsert = {
  id?: string;
  user_id?: string | null;
  event_type: string;
  provider?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
  created_at?: Timestamp;
};

// leads (public request / "solicitudes")
export type LeadStatus = 'new' | 'contacted' | 'converted' | 'rejected';
type LeadsRow = {
  id: string;
  full_name: string;
  email: string;
  phone: string;
  goal: string;
  experience_level: string | null;
  age: number | null;
  city: string | null;
  availability: string | null;
  injuries: string | null;
  message: string | null;
  status: LeadStatus;
  invitation_id: string | null;
  created_at: Timestamp;
};
type LeadsInsert = {
  id?: string;
  full_name: string;
  email: string;
  phone: string;
  goal: string;
  experience_level?: string | null;
  age?: number | null;
  city?: string | null;
  availability?: string | null;
  injuries?: string | null;
  message?: string | null;
  status?: LeadStatus;
  invitation_id?: string | null;
  created_at?: Timestamp;
};

// message_templates (coach-editable)
type MessageTemplatesRow = {
  key: string;
  channel: 'email' | 'whatsapp';
  enabled: boolean;
  subject: string | null;
  heading: string | null;
  body: string | null;
  cta_label: string | null;
  cta_target: string | null;
  updated_at: Timestamp;
};
type MessageTemplatesInsert = {
  key: string;
  channel: 'email' | 'whatsapp';
  enabled?: boolean;
  subject?: string | null;
  heading?: string | null;
  body?: string | null;
  cta_label?: string | null;
  cta_target?: string | null;
  updated_at?: Timestamp;
};

type Table<Row, Insert> = {
  Row: Row;
  Insert: Insert;
  Update: Partial<Insert>;
  Relationships: [];
};

export type Database = {
  public: {
    Tables: {
      profiles: Table<ProfilesRow, ProfilesInsert>;
      coach_profiles: Table<CoachProfilesRow, CoachProfilesInsert>;
      student_profiles: Table<StudentProfilesRow, StudentProfilesInsert>;
      coach_students: Table<CoachStudentsRow, CoachStudentsInsert>;
      invitations: Table<InvitationsRow, InvitationsInsert>;
      nutrition_plans: Table<NutritionPlansRow, NutritionPlansInsert>;
      nutrition_plan_food_recommendations: Table<NutritionRecRow, NutritionRecInsert>;
      food_items: Table<FoodItemsRow, FoodItemsInsert>;
      food_logs: Table<FoodLogsRow, FoodLogsInsert>;
      food_log_items: Table<FoodLogItemsRow, FoodLogItemsInsert>;
      workout_plans: Table<WorkoutPlansRow, WorkoutPlansInsert>;
      workout_plan_days: Table<WorkoutPlanDaysRow, WorkoutPlanDaysInsert>;
      exercises: Table<ExercisesRow, ExercisesInsert>;
      workout_plan_exercises: Table<WorkoutPlanExercisesRow, WorkoutPlanExercisesInsert>;
      workout_logs: Table<WorkoutLogsRow, WorkoutLogsInsert>;
      workout_log_sets: Table<WorkoutLogSetsRow, WorkoutLogSetsInsert>;
      weight_entries: Table<WeightEntriesRow, WeightEntriesInsert>;
      body_measurements: Table<BodyMeasurementsRow, BodyMeasurementsInsert>;
      progress_photos: Table<ProgressPhotosRow, ProgressPhotosInsert>;
      content_posts: Table<ContentPostsRow, ContentPostsInsert>;
      content_assignments: Table<ContentAssignmentsRow, ContentAssignmentsInsert>;
      coach_notes: Table<CoachNotesRow, CoachNotesInsert>;
      student_checkins: Table<StudentCheckinsRow, StudentCheckinsInsert>;
      alerts: Table<AlertsRow, AlertsInsert>;
      auth_events: Table<AuthEventsRow, AuthEventsInsert>;
      leads: Table<LeadsRow, LeadsInsert>;
      message_templates: Table<MessageTemplatesRow, MessageTemplatesInsert>;
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: { Args: Record<string, never>; Returns: string };
      is_coach: { Args: { uid?: string }; Returns: boolean };
      is_student: { Args: { uid?: string }; Returns: boolean };
      is_admin: { Args: { uid?: string }; Returns: boolean };
      coach_has_student: { Args: { coach: string; student: string }; Returns: boolean };
      check_rate_limit: {
        Args: { p_bucket: string; p_max: number; p_window_seconds: number };
        Returns: boolean;
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

/** Convenience row aliases. */
export type Profile = ProfilesRow;
export type CoachStudent = CoachStudentsRow;
export type Invitation = InvitationsRow;
export type NutritionPlan = NutritionPlansRow;
export type FoodItem = FoodItemsRow;
export type FoodLog = FoodLogsRow;
export type FoodLogItem = FoodLogItemsRow;
export type WorkoutPlan = WorkoutPlansRow;
export type Exercise = ExercisesRow;
export type WorkoutLog = WorkoutLogsRow;
export type WeightEntry = WeightEntriesRow;
export type BodyMeasurement = BodyMeasurementsRow;
export type ProgressPhoto = ProgressPhotosRow;
export type ContentPost = ContentPostsRow;
export type CoachNote = CoachNotesRow;
export type StudentCheckin = StudentCheckinsRow;
export type Alert = AlertsRow;
