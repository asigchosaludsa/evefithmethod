import Link from 'next/link';
import { Dumbbell, Plus, Scale } from 'lucide-react';
import { requireStudent } from '@/lib/auth/roles';
import { getStudentToday } from '@/lib/db/queries/student';
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

export const metadata = { title: 'Hoy' };

export default async function StudentTodayPage() {
  const profile = await requireStudent();
  const today = await getStudentToday(profile.id);
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
            <CardTitle>Entrenamiento</CardTitle>
          </CardHeader>
          <CardBody>
            {today.activeWorkoutPlan ? (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-foreground">
                  <Dumbbell className="size-4 text-primary" />
                  <span className="font-medium">{today.activeWorkoutPlan.title}</span>
                </div>
                <p className="text-sm text-muted">{today.activeWorkoutPlan.focus ?? 'Sesión de hoy'}</p>
                <Button asChild variant="secondary" size="sm">
                  <Link href="/student/workout">Ver y registrar</Link>
                </Button>
              </div>
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
