import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Apple, ArrowLeft, Dumbbell, LineChart, MessageCircle } from 'lucide-react';
import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { getStudentDetail } from '@/lib/db/queries/student-detail';
import { createClient } from '@/lib/supabase/server';
import { renderWhatsapp } from '@/lib/email/render';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@/components/common';
import { CoachNotesPanel } from '@/components/coach/CoachNotesPanel';
import { AlertManager } from '@/components/coach/AlertManager';
import { UnlinkStudentButton } from '@/components/coach/UnlinkStudentButton';
import { SendPlanButton } from '@/components/coach/SendPlanButton';
import { formatDate, formatDateTime } from '@/lib/utils/date';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://evefitmethod.com').replace(/\/$/, '');

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const coach = await requireCoach();
  await assertCoachOwnsStudent(coach.id, studentId);
  const detail = await getStudentDetail(studentId, coach.id);
  if (!detail) notFound();

  const sp = detail.studentProfile;
  const lastWeight = detail.weightEntries[0];
  const studentName = detail.profile.full_name ?? 'Alumna';
  const firstName = studentName.split(' ')[0];

  // WhatsApp welcome action (server-computed). Renders nothing if disabled.
  const supabase = await createClient();
  const { data: studentProfileRow } = await supabase
    .from('profiles')
    .select('phone')
    .eq('id', studentId)
    .maybeSingle();
  const phone = studentProfileRow?.phone ?? '';
  const wa = await renderWhatsapp('wa_welcome', { nombre: firstName, link: `${SITE}/login` });
  const waHref = wa
    ? `https://wa.me/${phone.replace(/\D/g, '')}?text=${encodeURIComponent(wa.text)}`
    : null;

  return (
    <div className="space-y-6">
      <Link href="/coach/students" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Alumnas
      </Link>

      <PageHeader
        title={studentName}
        description={sp?.goal ?? 'Sin objetivo definido'}
        actions={
          <div className="flex flex-wrap items-start gap-2">
            <SendPlanButton studentId={studentId} />
            {waHref && (
              <Button asChild variant="outline" size="sm">
                <a href={waHref} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="size-4" /> Bienvenida por WhatsApp
                </a>
              </Button>
            )}
            <UnlinkStudentButton studentId={studentId} studentName={studentName} />
          </div>
        }
      />

      {/* Tabs */}
      <nav className="flex gap-2 overflow-x-auto border-b border-hairline pb-px">
        {[
          { href: `/coach/students/${studentId}/nutrition`, label: 'Nutrición', icon: Apple },
          { href: `/coach/students/${studentId}/workouts`, label: 'Entrenos', icon: Dumbbell },
          { href: `/coach/students/${studentId}/progress`, label: 'Progreso', icon: LineChart },
        ].map((t) => (
          <Button key={t.href} asChild variant="ghost" size="sm">
            <Link href={t.href}>
              <t.icon className="size-4" /> {t.label}
            </Link>
          </Button>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Alertas</CardTitle>
            </CardHeader>
            <CardBody>
              <AlertManager studentId={studentId} alerts={detail.openAlerts} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Últimas comidas</CardTitle>
            </CardHeader>
            <CardBody>
              {detail.recentFoodLogs.length === 0 ? (
                <p className="text-sm text-faint">Sin registros aún.</p>
              ) : (
                <ul className="divide-y divide-hairline">
                  {detail.recentFoodLogs.map((f) => (
                    <li key={f.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="capitalize text-foreground">{f.meal_type}</span>
                      <span className="text-muted">{formatDateTime(f.logged_at)}</span>
                      <Badge tone={f.coach_review_status === 'reviewed' ? 'success' : f.coach_review_status === 'flagged' ? 'danger' : 'neutral'}>
                        {f.coach_review_status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Últimos entrenamientos</CardTitle>
            </CardHeader>
            <CardBody>
              {detail.recentWorkoutLogs.length === 0 ? (
                <p className="text-sm text-faint">Sin registros aún.</p>
              ) : (
                <ul className="divide-y divide-hairline">
                  {detail.recentWorkoutLogs.map((w) => (
                    <li key={w.id} className="flex items-center justify-between py-2 text-sm">
                      <span className="capitalize text-foreground">{w.status}</span>
                      <span className="text-muted">{formatDateTime(w.logged_at)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Datos físicos</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <Row label="Objetivo" value={sp?.goal} />
              <Row label="Nivel" value={sp?.training_level} />
              <Row label="Altura" value={sp?.height_cm ? `${sp.height_cm} cm` : null} />
              <Row label="Peso inicial" value={sp?.initial_weight_kg ? `${sp.initial_weight_kg} kg` : null} />
              <Row label="Peso actual" value={sp?.current_weight_kg ? `${sp.current_weight_kg} kg` : null} />
              <Row label="Último peso" value={lastWeight ? `${lastWeight.weight_kg} kg · ${formatDate(lastWeight.recorded_at)}` : null} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Planes activos</CardTitle>
            </CardHeader>
            <CardBody className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-muted">Nutrición</span>
                {detail.activeNutritionPlan ? (
                  <span className="text-foreground">{detail.activeNutritionPlan.title}</span>
                ) : (
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/coach/students/${studentId}/nutrition`}>Crear</Link>
                  </Button>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-muted">Entrenamiento</span>
                {detail.activeWorkoutPlan ? (
                  <span className="text-foreground">{detail.activeWorkoutPlan.title}</span>
                ) : (
                  <Button asChild size="sm" variant="secondary">
                    <Link href={`/coach/students/${studentId}/workouts`}>Crear</Link>
                  </Button>
                )}
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notas internas</CardTitle>
            </CardHeader>
            <CardBody>
              <CoachNotesPanel studentId={studentId} notes={detail.notes} />
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted">{label}</span>
      <span className="text-foreground">{value ?? '—'}</span>
    </div>
  );
}
