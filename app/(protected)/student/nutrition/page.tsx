import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { Button, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, StatCard } from '@/components/common';
import { getStudentNutritionRange } from '@/lib/db/queries/student-nutrition';
import { NutritionCalendar } from '@/components/nutrition/NutritionCalendar';
import { NutritionAdherenceChart, type AdherencePoint } from '@/components/nutrition/NutritionAdherenceChart';
import { MacroLegend } from '@/components/nutrition/MacroLine';
import { macroTextClass } from '@/lib/nutrition/macro-display';
import { addDaysISO } from '@/domain/workouts/calendar';

export const metadata = { title: 'Mi nutrición' };

export default async function StudentNutritionPlanPage() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const { data: plan } = await supabase
    .from('nutrition_plans')
    .select('*')
    .eq('student_id', profile.id)
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const todayISO = new Date().toISOString().slice(0, 10);
  const startISO = addDaysISO(todayISO, -27);
  const range = await getStudentNutritionRange(profile.id, startISO, todayISO);
  const points: AdherencePoint[] = [];
  for (let d = startISO; d <= todayISO; d = addDaysISO(d, 1)) {
    points.push({ dateISO: d, calories: range.byDate[d]?.consumed.calories ?? 0 });
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mi nutrición"
        description="Tu plan activo y tus metas."
        actions={
          <Button asChild>
            <Link href="/student/meals/new">
              <Plus className="size-4" /> Registrar comida
            </Link>
          </Button>
        }
      />

      {!plan ? (
        <EmptyState
          title="Sin plan activo"
          description="Tu coach asignará tu plan nutricional pronto. Mientras, puedes registrar tus comidas."
        />
      ) : (
        <>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              <StatCard label="Calorías" value={plan.calories_target ?? '—'} hint="kcal/día" tone="primary" />
              <StatCard
                label="Proteína"
                value={plan.protein_target_g != null ? `${plan.protein_target_g} g` : '—'}
                valueClassName={macroTextClass('protein_g')}
              />
              <StatCard
                label="Carbohidratos"
                value={plan.carbs_target_g != null ? `${plan.carbs_target_g} g` : '—'}
                valueClassName={macroTextClass('carbs_g')}
              />
              <StatCard
                label="Grasa"
                value={plan.fat_target_g != null ? `${plan.fat_target_g} g` : '—'}
                valueClassName={macroTextClass('fat_g')}
              />
            </div>
            <MacroLegend />
          </div>

          <Card>
            <CardHeader>
              <CardTitle>{plan.title}</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              {plan.meals_per_day && (
                <p className="text-muted">
                  Comidas por día: <span className="text-foreground">{plan.meals_per_day}</span>
                </p>
              )}
              {plan.notes ? (
                <div>
                  <p className="mb-1 font-medium text-foreground">Notas de tu coach</p>
                  <p className="whitespace-pre-wrap leading-relaxed text-muted">{plan.notes}</p>
                </div>
              ) : (
                <p className="text-faint">Tu coach no agregó notas a este plan.</p>
              )}
            </CardBody>
          </Card>
        </>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Calendario de adherencia</CardTitle>
        </CardHeader>
        <CardBody>
          <NutritionCalendar
            byDate={range.byDate}
            target={{ calories: range.target.calories }}
            todayISO={todayISO}
          />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tendencia de calorías</CardTitle>
        </CardHeader>
        <CardBody>
          <NutritionAdherenceChart points={points} target={range.target.calories} />
        </CardBody>
      </Card>
    </div>
  );
}
