import 'server-only';
import { createClient } from '@/lib/supabase/server';
import type {
  Alert,
  CoachNote,
  FoodLog,
  NutritionPlan,
  Profile,
  WeightEntry,
  WorkoutLog,
  WorkoutPlan,
} from '@/types/database';

export interface StudentDetail {
  profile: Pick<Profile, 'id' | 'full_name' | 'email' | 'avatar_url'>;
  studentProfile: {
    goal: string | null;
    training_level: string | null;
    height_cm: number | null;
    initial_weight_kg: number | null;
    current_weight_kg: number | null;
    age: number | null;
    notes: string | null;
  } | null;
  activeNutritionPlan: NutritionPlan | null;
  activeWorkoutPlan: WorkoutPlan | null;
  recentFoodLogs: FoodLog[];
  recentWorkoutLogs: WorkoutLog[];
  weightEntries: WeightEntry[];
  notes: CoachNote[];
  openAlerts: Alert[];
}

export async function getStudentDetail(studentId: string, coachId: string): Promise<StudentDetail | null> {
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, full_name, email, avatar_url')
    .eq('id', studentId)
    .single();
  if (!profile) return null;

  const [
    { data: studentProfile },
    { data: nutritionPlan },
    { data: workoutPlan },
    { data: foodLogs },
    { data: workoutLogs },
    { data: weights },
    { data: notes },
    { data: alerts },
  ] = await Promise.all([
    supabase
      .from('student_profiles')
      .select('goal, training_level, height_cm, initial_weight_kg, current_weight_kg, age, notes')
      .eq('user_id', studentId)
      .maybeSingle(),
    supabase
      .from('nutrition_plans')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('workout_plans')
      .select('*')
      .eq('student_id', studentId)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase.from('food_logs').select('*').eq('student_id', studentId).order('logged_at', { ascending: false }).limit(5),
    supabase.from('workout_logs').select('*').eq('student_id', studentId).order('logged_at', { ascending: false }).limit(5),
    supabase.from('weight_entries').select('*').eq('student_id', studentId).order('recorded_at', { ascending: false }).limit(10),
    supabase.from('coach_notes').select('*').eq('student_id', studentId).eq('coach_id', coachId).order('created_at', { ascending: false }),
    supabase.from('alerts').select('*').eq('student_id', studentId).eq('coach_id', coachId).eq('status', 'open').order('created_at', { ascending: false }),
  ]);

  return {
    profile,
    studentProfile: studentProfile ?? null,
    activeNutritionPlan: nutritionPlan ?? null,
    activeWorkoutPlan: workoutPlan ?? null,
    recentFoodLogs: foodLogs ?? [],
    recentWorkoutLogs: workoutLogs ?? [],
    weightEntries: weights ?? [],
    notes: notes ?? [],
    openAlerts: alerts ?? [],
  };
}
