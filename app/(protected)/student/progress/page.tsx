import { requireStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { calculateWeeklyWeightTrend } from '@/domain/progress/calculations';
import { Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, StatCard } from '@/components/common';
import { MeasurementForm, WeightForm } from '@/components/student/ProgressForms';
import { formatDate } from '@/lib/utils/date';

export const metadata = { title: 'Mi progreso' };

export default async function StudentProgressPage() {
  const profile = await requireStudent();
  const supabase = await createClient();
  const [{ data: weights }, { data: measurements }] = await Promise.all([
    supabase.from('weight_entries').select('*').eq('student_id', profile.id).order('recorded_at', { ascending: false }).limit(20),
    supabase.from('body_measurements').select('*').eq('student_id', profile.id).order('recorded_at', { ascending: false }).limit(10),
  ]);

  const trend = calculateWeeklyWeightTrend((weights ?? []).map((w) => ({ weight_kg: w.weight_kg, recorded_at: w.recorded_at })));
  const latest = weights?.[0];

  return (
    <div className="space-y-6">
      <PageHeader title="Mi progreso" description="Registra tu peso y medidas, y mira tu evolución." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Peso actual" value={latest ? `${latest.weight_kg} kg` : '—'} />
        <StatCard
          label="Tendencia"
          value={trend.change === 0 ? '—' : `${trend.change > 0 ? '+' : ''}${trend.change} kg`}
          tone={trend.direction === 'down' ? 'success' : 'default'}
        />
        <StatCard label="Registros" value={weights?.length ?? 0} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Registrar peso</CardTitle>
          </CardHeader>
          <CardBody>
            <WeightForm />
          </CardBody>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Registrar medidas</CardTitle>
          </CardHeader>
          <CardBody>
            <MeasurementForm />
          </CardBody>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Historial de peso</CardTitle>
        </CardHeader>
        <CardBody>
          {!weights || weights.length === 0 ? (
            <EmptyState title="Sin registros de peso" description="Registra tu primer peso arriba." />
          ) : (
            <ul className="divide-y divide-hairline">
              {weights.map((w) => (
                <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="tabular text-foreground">{w.weight_kg} kg</span>
                  <span className="text-muted">{formatDate(w.recorded_at)}</span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Historial de medidas</CardTitle>
        </CardHeader>
        <CardBody>
          {!measurements || measurements.length === 0 ? (
            <EmptyState title="Sin medidas" description="Registra tus primeras medidas arriba." />
          ) : (
            <ul className="divide-y divide-hairline">
              {measurements.map((m) => (
                <li key={m.id} className="flex items-center justify-between py-2 text-sm">
                  <span className="text-muted">{formatDate(m.recorded_at)}</span>
                  <span className="tabular text-foreground">
                    {[
                      m.waist_cm && `Cintura ${m.waist_cm}`,
                      m.hip_cm && `Cadera ${m.hip_cm}`,
                      m.arm_cm && `Brazo ${m.arm_cm}`,
                    ]
                      .filter(Boolean)
                      .join(' · ') || '—'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
