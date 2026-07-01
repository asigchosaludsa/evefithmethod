'use server';

import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { getActiveWorkoutPlanContent } from '@/lib/db/queries/workout-plan';
import { renderEmail } from '@/lib/email/render';
import { sendEmail } from '@/lib/email/send';
import { buildPlanPdf, type PlanPdfInput } from '@/lib/pdf/plan';

/**
 * Build the student's active plan as a PDF and email it to her, using the
 * coach-editable `plan_ready` template. Returns a discriminated result so the
 * client can show inline feedback.
 */
export async function sendPlanEmail(
  studentId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const coach = await requireCoach();
    await assertCoachOwnsStudent(coach.id, studentId);

    const supabase = await createClient();

    const [{ data: profile }, { data: nutritionPlan }, workoutContent] = await Promise.all([
      supabase.from('profiles').select('full_name, email').eq('id', studentId).single(),
      supabase
        .from('nutrition_plans')
        .select('*')
        .eq('student_id', studentId)
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle(),
      getActiveWorkoutPlanContent(studentId),
    ]);

    if (!profile?.email) {
      return { ok: false, error: 'La alumna no tiene un correo registrado.' };
    }

    const studentName = profile.full_name ?? 'Alumna';

    const nutrition: PlanPdfInput['nutrition'] = nutritionPlan
      ? {
          title: nutritionPlan.title,
          calories: nutritionPlan.calories_target,
          protein: nutritionPlan.protein_target_g,
          carbs: nutritionPlan.carbs_target_g,
          fat: nutritionPlan.fat_target_g,
          notes: nutritionPlan.notes,
        }
      : null;

    const workout: PlanPdfInput['workout'] = workoutContent
      ? {
          title: workoutContent.plan.title,
          weeks: workoutContent.plan.weeks,
          days: workoutContent.days.map((d) => ({
            title: d.title,
            weekday: d.weekday,
            exercises: d.exercises.map((ex) => ({
              name: ex.exercise_name,
              sets: ex.sets,
              reps: ex.reps,
              suggestedWeight: ex.suggested_weight_kg,
            })),
          })),
        }
      : null;

    const pdf = await buildPlanPdf({ studentName, nutrition, workout });
    const base64 = pdf.toString('base64');

    const rendered = await renderEmail('plan_ready', { nombre: studentName });
    if (!rendered) {
      return { ok: false, error: 'La plantilla de plan esta desactivada.' };
    }

    const sent = await sendEmail({
      to: profile.email,
      subject: rendered.subject,
      html: rendered.html,
      attachments: [{ filename: 'Plan-EveFit.pdf', content: base64 }],
    });

    if (!sent) {
      return { ok: false, error: 'No se pudo enviar el correo. Intenta de nuevo.' };
    }

    return { ok: true };
  } catch {
    return { ok: false, error: 'Ocurrio un error al enviar el plan.' };
  }
}
