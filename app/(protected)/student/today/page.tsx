import Link from 'next/link';
import { CheckCircle2, Dumbbell, Flame, Moon, Plus, Scale, Utensils } from 'lucide-react';
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
  PageHeader,
} from '@/components/common';
import { MacroProgress } from '@/components/student/MacroProgress';
import { MacroRescuePanel } from '@/components/student/MacroRescuePanel';
import { CoachTipCard } from '@/components/student/CoachTipCard';
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

  // --- Hero "resumen de hoy" (a partir de los datos ya cargados) ---
  const trainingSummary: { label: string; icon: typeof Dumbbell; tone: 'primary' | 'success' | 'muted' } =
    !calendar.plan
      ? { label: 'Sin plan', icon: Moon, tone: 'muted' }
      : todayDone
        ? { label: todayStatus === 'skipped' ? 'No hecho' : 'Completado', icon: CheckCircle2, tone: 'success' }
        : todayPlanDay
          ? { label: 'Hoy te toca', icon: Dumbbell, tone: 'primary' }
          : { label: 'Descanso', icon: Moon, tone: 'muted' };

  const consumedKcal = Math.round(today.consumed.calories);
  const nutritionValue = consumedKcal > 0 || target.calories ? `${consumedKcal}` : '—';
  const nutritionSub = target.calories ? `de ${target.calories} kcal` : 'kcal hoy';

  const heroItems = [
    {
      key: 'training',
      icon: trainingSummary.icon,
      tone: trainingSummary.tone,
      label: 'Entrenamiento',
      value: trainingSummary.label,
      sub: streak > 0 ? `Racha de ${streak} ${streak === 1 ? 'día' : 'días'}` : 'Hoy',
      streak: streak > 0,
    },
    {
      key: 'nutrition',
      icon: Utensils,
      tone: 'primary' as const,
      label: 'Nutrición',
      value: nutritionValue,
      sub: nutritionSub,
      streak: false,
    },
    {
      key: 'weight',
      icon: Scale,
      tone: 'muted' as const,
      label: 'Peso actual',
      value: today.lastWeightKg ? `${today.lastWeightKg}` : '—',
      sub: today.lastWeightKg ? 'kg' : 'sin registro',
      streak: false,
    },
  ];

  const toneClass = (tone: 'primary' | 'success' | 'muted') =>
    tone === 'primary'
      ? 'text-primary'
      : tone === 'success'
        ? 'text-success'
        : 'text-muted';

  return (
    <div className="space-y-6">
      <div className="efm-fade-up" style={{ ['--efm-step' as string]: 0 }}>
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
      </div>

      {/* Hero "resumen de hoy": entreno · nutrición · peso. */}
      <div className="grid gap-3 sm:grid-cols-3">
        {heroItems.map((item, i) => {
          const Icon = item.icon;
          return (
            <Card
              key={item.key}
              className="efm-fade-up flex items-center gap-3 px-4 py-3.5"
              style={{ ['--efm-step' as string]: i + 1 }}
            >
              <div
                className={`flex size-10 shrink-0 items-center justify-center rounded-xl bg-elevated ${toneClass(item.tone)}`}
              >
                <Icon className="size-5" />
              </div>
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-faint">{item.label}</p>
                <div className="flex items-baseline gap-1.5">
                  <span className="tabular text-lg font-bold leading-tight text-foreground">{item.value}</span>
                  {item.streak ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-primary">
                      <Flame className="size-3" /> {item.sub}
                    </span>
                  ) : (
                    <span className="truncate text-xs text-muted">{item.sub}</span>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Fila de 2 columnas: entrenamiento de hoy · tip de la coach. */}
      <div className="grid gap-4 lg:grid-cols-2">
        <Card
          className="efm-fade-up"
          style={{ ['--efm-step' as string]: 4 }}
        >
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

        <div className="efm-fade-up" style={{ ['--efm-step' as string]: 5 }}>
          <CoachTipCard tip={today.assignedTip} />
        </div>
      </div>

      {/* Nutrición a todo el ancho + registrar peso. */}
      <Card className="efm-fade-up" style={{ ['--efm-step' as string]: 6 }}>
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
          <div className="flex flex-wrap items-center gap-2 border-t border-hairline pt-4">
            <Button asChild variant="secondary" size="sm">
              <Link href="/student/progress">
                <Scale className="size-4" /> Registrar peso
              </Link>
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
