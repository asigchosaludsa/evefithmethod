import Link from 'next/link';
import { Dumbbell, Moon, Plus, Scale } from 'lucide-react';
import { requireStudent } from '@/lib/auth/roles';
import { getStudentToday } from '@/lib/db/queries/student';
import { getTrainingCalendarData } from '@/lib/db/queries/training-calendar';
import { buildCalendar } from '@/domain/workouts/calendar';
import { exerciseStatusForDay, type LoggedSet } from '@/domain/workouts/progression';
import { currentStreak, type ScheduledSession } from '@/domain/workouts/streak';
import {
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
} from '@/components/common';
import { MacroProgress } from '@/components/student/MacroProgress';
import { MacroRescuePanel } from '@/components/student/MacroRescuePanel';
import { SessionCompleteCard, type SessionExerciseLine } from '@/components/workouts/SessionCompleteCard';

export const metadata = { title: 'Hoy' };

export default async function StudentTodayPage() {
  const profile = await requireStudent();
  const today = await getStudentToday(profile.id);
  const calendar = await getTrainingCalendarData(profile.id);
  const todayISO = new Date().toISOString().slice(0, 10);
  const todayPlanDay = calendar.plan
    ? buildCalendar(calendar.days, calendar.plan.starts_at, calendar.plan.weeks, todayISO, todayISO)[0]?.planDay ?? null
    : null;

  const todayKey = todayPlanDay ? `${todayPlanDay.id}|${todayISO}` : null;
  const todayStatus = todayKey ? calendar.statusByKey[todayKey] ?? null : null;
  const todayDone = todayStatus === 'completed' || todayStatus === 'skipped';

  // Racha: sesiones programadas desde el inicio del plan hasta hoy.
  let streak = 0;
  let todayExerciseLines: SessionExerciseLine[] = [];
  if (calendar.plan && todayPlanDay) {
    const scheduled: ScheduledSession[] = buildCalendar(
      calendar.days,
      calendar.plan.starts_at,
      calendar.plan.weeks,
      calendar.plan.starts_at ?? todayISO,
      todayISO,
    )
      .filter((d) => d.planDay)
      .map((d) => ({ dateISO: d.dateISO, planDayId: d.planDay!.id }));
    streak = currentStreak(scheduled, calendar.statusByKey, todayISO);

    const planExercises = calendar.exercisesByDay[todayPlanDay.id] ?? [];
    const sessionSets: LoggedSet[] = (calendar.setsByKey[todayKey!] ?? []).map((s) => ({
      exercise_id: s.exercise_id,
      weight_kg: s.weight_kg,
      completed: s.completed,
      session_date: todayISO,
    }));
    const planIds = planExercises.map((e) => e.exercise_id).filter((x): x is string => !!x);
    const statusMap = exerciseStatusForDay(planIds, sessionSets);
    todayExerciseLines = planExercises.map((e) => ({
      name: e.name,
      status: e.exercise_id ? (statusMap[e.exercise_id] ?? 'missed') : 'missed',
    }));
  }
  const todayDateLabel = new Date(todayISO + 'T00:00:00').toLocaleDateString('es-ES', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const plan = today.activeNutritionPlan;
  const target = {
    calories: plan?.calories_target ?? null,
    protein_g: plan?.protein_target_g ?? null,
    carbs_g: plan?.carbs_target_g ?? null,
    fat_g: plan?.fat_target_g ?? null,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Hoy"
        title={`Hola, ${profile.full_name?.split(' ')[0] ?? ''}`}
        description="Esto es lo que toca hoy."
        actions={
          <Button asChild>
            <Link href="/student/meals/new">
              <Plus className="size-4" /> Registrar comida
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>{plan ? plan.title : 'Nutrición'}</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          {plan ? (
            <MacroProgress consumed={today.consumed} target={target} />
          ) : (
            <p className="text-sm text-muted">
              Aún no tienes un plan nutricional activo. Tu coach lo asignará pronto.
            </p>
          )}
          {plan && <MacroRescuePanel consumed={today.consumed} target={target} />}
        </CardBody>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{todayDone ? 'Tu entrenamiento de hoy' : 'Hoy te toca'}</CardTitle>
          </CardHeader>
          <CardBody>
            {calendar.plan ? (
              todayDone && todayPlanDay ? (
                <SessionCompleteCard
                  dateLabel={todayDateLabel}
                  focusLabel={todayPlanDay.focus ?? todayPlanDay.title}
                  streak={streak}
                  exercises={todayExerciseLines}
                  skipped={todayStatus === 'skipped'}
                />
              ) : (
                <div className="space-y-3">
                  {todayPlanDay ? (
                    <>
                      <div className="flex items-center gap-2 text-foreground">
                        <Dumbbell className="size-4 text-primary" />
                        <span className="font-medium">{todayPlanDay.focus ?? todayPlanDay.title}</span>
                      </div>
                      <p className="text-sm text-muted">{calendar.plan.title}</p>
                      <Button asChild variant="secondary" size="sm">
                        <Link href="/student/workout">Ver y registrar</Link>
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-foreground">
                        <Moon className="size-4 text-muted" />
                        <span className="font-medium">Hoy descansas</span>
                      </div>
                      <p className="text-sm text-muted">Recupera bien para tu próxima sesión.</p>
                      <Button asChild variant="ghost" size="sm">
                        <Link href="/student/workout">Ver calendario</Link>
                      </Button>
                    </>
                  )}
                </div>
              )
            ) : (
              <p className="text-sm text-muted">Sin plan de entrenamiento activo.</p>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tu peso</CardTitle>
          </CardHeader>
          <CardBody className="space-y-3">
            <div className="flex items-center gap-2">
              <Scale className="size-4 text-muted" />
              <span className="tabular text-2xl font-bold text-foreground">
                {today.lastWeightKg ? `${today.lastWeightKg} kg` : '—'}
              </span>
            </div>
            <Button asChild variant="secondary" size="sm">
              <Link href="/student/progress">Registrar peso</Link>
            </Button>
          </CardBody>
        </Card>
      </div>

      {today.assignedTip ? (
        <Card>
          <CardHeader>
            <CardTitle>Tip de tu coach</CardTitle>
          </CardHeader>
          <CardBody>
            <Link href="/student/content" className="group block">
              <p className="font-medium text-foreground group-hover:text-primary">{today.assignedTip.title}</p>
              {today.assignedTip.summary && <p className="mt-1 text-sm text-muted">{today.assignedTip.summary}</p>}
            </Link>
          </CardBody>
        </Card>
      ) : (
        <EmptyState title="Sin tips nuevos" description="Tu coach te asignará contenido pronto." />
      )}
    </div>
  );
}
