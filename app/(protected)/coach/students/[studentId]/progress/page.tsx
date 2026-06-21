import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { calculateWeeklyWeightTrend } from '@/domain/progress/calculations';
import { Badge, Card, CardBody, CardHeader, CardTitle, EmptyState, PageHeader, StatCard } from '@/components/common';
import { formatDate } from '@/lib/utils/date';

export default async function StudentProgressPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const coach = await requireCoach();
  await assertCoachOwnsStudent(coach.id, studentId);

  const supabase = await createClient();
  const [{ data: weights }, { data: measurements }] = await Promise.all([
    supabase.from('weight_entries').select('*').eq('student_id', studentId).order('recorded_at', { ascending: false }).limit(20),
    supabase.from('body_measurements').select('*').eq('student_id', studentId).order('recorded_at', { ascending: false }).limit(10),
  ]);

  const trend = calculateWeeklyWeightTrend(
    (weights ?? []).map((w) => ({ weight_kg: w.weight_kg, recorded_at: w.recorded_at })),
  );
  const latest = weights?.[0];

  return (
    <div className="space-y-6">
      <Link href={`/coach/students/${studentId}`} className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Volver a la alumna
      </Link>
      <PageHeader title="Progreso" description="Evolución de peso y medidas." />

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
            <CardTitle>Historial de peso</CardTitle>
          </CardHeader>
          <CardBody>
            {!weights || weights.length === 0 ? (
              <EmptyState title="Sin registros de peso" />
            ) : (
              <ul className="divide-y divide-hairline">
                {weights.map((w) => (
                  <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                    <span className="text-foreground">{w.weight_kg} kg</span>
                    <span className="text-muted">{formatDate(w.recorded_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Medidas</CardTitle>
          </CardHeader>
          <CardBody>
            {!measurements || measurements.length === 0 ? (
              <EmptyState title="Sin medidas" />
            ) : (
              <ul className="divide-y divide-hairline">
                {measurements.map((m) => (
                  <li key={m.id} className="py-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted">{formatDate(m.recorded_at)}</span>
                      <Badge tone="neutral">
                        {[m.waist_cm && `C ${m.waist_cm}`, m.hip_cm && `Cad ${m.hip_cm}`].filter(Boolean).join(' · ') || '—'}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
