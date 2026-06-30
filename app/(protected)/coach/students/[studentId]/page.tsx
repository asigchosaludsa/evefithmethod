import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  Activity,
  Apple,
  ArrowLeft,
  CalendarDays,
  Dumbbell,
  LineChart,
  Mail,
  MessageCircle,
  Ruler,
  Salad,
  Target,
  TrendingUp,
} from 'lucide-react';
import { requireCoach, assertCoachOwnsStudent } from '@/lib/auth/roles';
import { getStudentDetail } from '@/lib/db/queries/student-detail';
import { getStudentProgressDashboard } from '@/lib/db/queries/progress-dashboard';
import { getStudentRecentActivity } from '@/lib/db/queries/student-recent-activity';
import { goalProgressPct, remainingToGoal } from '@/domain/progress/goals';
import { createClient } from '@/lib/supabase/server';
import { renderWhatsapp } from '@/lib/email/render';
import { normalizeWhatsappNumber, isValidWhatsappNumber } from '@/lib/utils/whatsapp';
import { todayISO, daysAgoISO } from '@/lib/utils/date';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  PageHeader,
} from '@/components/common';
import { GoalProgressRing } from '@/components/progress/GoalProgressRing';
import { TrainingSummaryCard } from '@/components/progress/TrainingSummaryCard';
import { NutritionAdherenceSummary } from '@/components/progress/NutritionAdherenceSummary';
import { WeightTrendChart } from '@/components/progress/WeightTrendChart';
import { MeasurementDeltas } from '@/components/progress/MeasurementDeltas';
import { CoachNotesPanel } from '@/components/coach/CoachNotesPanel';
import { StudentActivityFeed } from '@/components/coach/StudentActivityFeed';
import {
  StudentAlertsCompact,
  type CompactAlertRow,
  type DerivedSignal,
} from '@/components/coach/StudentAlertsCompact';
import { UnlinkStudentButton } from '@/components/coach/UnlinkStudentButton';
import { SendPlanButton } from '@/components/coach/SendPlanButton';

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? 'https://evefitmethod.com').replace(/\/$/, '');

const STATUS_META: Record<string, { tone: 'success' | 'warning' | 'neutral'; label: string }> = {
  active: { tone: 'success', label: 'Activa' },
  pending: { tone: 'warning', label: 'Pendiente' },
  inactive: { tone: 'neutral', label: 'Inactiva' },
};

export default async function StudentDetailPage({
  params,
}: {
  params: Promise<{ studentId: string }>;
}) {
  const { studentId } = await params;
  const coach = await requireCoach();
  await assertCoachOwnsStudent(coach.id, studentId);

  const today = todayISO();
  const [detail, dashboard, activity] = await Promise.all([
    getStudentDetail(studentId, coach.id),
    getStudentProgressDashboard(studentId, today),
    getStudentRecentActivity(studentId, 8),
  ]);
  if (!detail) notFound();

  const sp = detail.studentProfile;
  const studentName = detail.profile.full_name ?? 'Alumna';
  const firstName = studentName.split(' ')[0] ?? studentName;
  const email = detail.profile.email ?? null;

  // Contacto: teléfono + estado de cuenta (datos no incluidos en getStudentDetail).
  const supabase = await createClient();
  const { data: profileRow } = await supabase
    .from('profiles')
    .select('phone, status')
    .eq('id', studentId)
    .maybeSingle();
  const phone = profileRow?.phone ?? '';
  const status = STATUS_META[profileRow?.status ?? ''] ?? null;

  const wa = await renderWhatsapp('wa_welcome', { nombre: firstName, link: `${SITE}/login` });
  const waHref =
    wa && isValidWhatsappNumber(phone)
      ? `https://wa.me/${normalizeWhatsappNumber(phone)}?text=${encodeURIComponent(wa.text)}`
      : null;

  // --- Datos "de un vistazo" (reusan getStudentProgressDashboard) ---
  const { weight, training, nutrition, measurements } = dashboard;
  const pct = goalProgressPct(weight.firstKg, weight.currentKg, weight.goalKg);
  const remainingKg = remainingToGoal(weight.currentKg, weight.goalKg);

  // --- Señales derivadas para las alertas compactas (sin persistir) ---
  const signals: DerivedSignal[] = [];
  const lastMealAt = activity.find((a) => a.kind === 'meal')?.at ?? null;
  const lastWorkoutAt = activity.find((a) => a.kind === 'workout')?.at ?? null;
  if (!lastMealAt || lastMealAt.slice(0, 10) < today) {
    signals.push({ tone: 'warning', label: 'Sin comida hoy' });
  }
  if (!lastWorkoutAt || lastWorkoutAt.slice(0, 10) < daysAgoISO(3)) {
    signals.push({ tone: 'warning', label: 'Entreno pendiente' });
  }
  if (nutrition.daysLogged > 0 && nutrition.pctDaysOk < 50) {
    signals.push({ tone: 'danger', label: 'Adherencia baja' });
  }

  const openAlerts: CompactAlertRow[] = detail.openAlerts.map((a) => ({
    id: a.id,
    title: a.title,
    message: a.message,
    severity: a.severity,
    created_at: a.created_at,
  }));

  const tabs = [
    { href: `/coach/students/${studentId}/nutrition`, label: 'Nutrición', icon: Apple },
    { href: `/coach/students/${studentId}/workouts`, label: 'Entrenos', icon: Dumbbell },
    { href: `/coach/students/${studentId}/progress`, label: 'Progreso', icon: LineChart },
    { href: `/coach/students/${studentId}/calendar`, label: 'Calendario', icon: CalendarDays },
  ];

  let step = 0;
  const next = () => step++;

  return (
    <div className="space-y-6">
      <Link
        href="/coach/students"
        className="inline-flex items-center gap-1 text-sm text-muted transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Alumnas
      </Link>

      <div className="efm-fade-up" style={{ ['--efm-step' as string]: next() }}>
        <PageHeader
          eyebrow="Alumna"
          title={studentName}
          description={sp?.goal ?? 'Sin objetivo definido'}
          actions={
            <div className="flex flex-wrap items-start justify-end gap-2">
              {status && <Badge tone={status.tone}>{status.label}</Badge>}
              {waHref && (
                <Button asChild variant="outline" size="sm">
                  <a href={waHref} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="size-4" /> WhatsApp
                  </a>
                </Button>
              )}
              {email && (
                <Button asChild variant="outline" size="sm">
                  <a href={`mailto:${email}`}>
                    <Mail className="size-4" /> Correo
                  </a>
                </Button>
              )}
              <SendPlanButton studentId={studentId} />
              <UnlinkStudentButton studentId={studentId} studentName={studentName} />
            </div>
          }
        />
      </div>

      {/* Fila "de un vistazo": peso · entrenamiento · nutrición. */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="efm-fade-up" style={{ ['--efm-step' as string]: next() }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Target className="size-4 text-primary" /> Peso y meta
            </CardTitle>
          </CardHeader>
          <CardBody>
            <GoalProgressRing
              pct={pct}
              currentKg={weight.currentKg}
              goalKg={weight.goalKg}
              remainingKg={remainingKg}
            />
          </CardBody>
        </Card>

        <Card className="efm-fade-up" style={{ ['--efm-step' as string]: next() }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Dumbbell className="size-4 text-primary" /> Entrenamiento
            </CardTitle>
          </CardHeader>
          <CardBody>
            <TrainingSummaryCard
              sessionsLast30={training.sessionsLast30}
              streak={training.streak}
              topProgressions={training.topProgressions}
            />
          </CardBody>
        </Card>

        <Card className="efm-fade-up" style={{ ['--efm-step' as string]: next() }}>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Salad className="size-4 text-primary" /> Nutrición
            </CardTitle>
          </CardHeader>
          <CardBody>
            <NutritionAdherenceSummary
              pctDaysOk={nutrition.pctDaysOk}
              daysLogged={nutrition.daysLogged}
              points={nutrition.points}
              targetCalories={nutrition.targetCalories}
            />
          </CardBody>
        </Card>
      </div>

      {/* Alertas compactas (badges + gestionar) */}
      <Card className="efm-fade-up" style={{ ['--efm-step' as string]: next() }}>
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2 text-sm">
            <Activity className="size-4 text-primary" /> Alertas
          </CardTitle>
        </CardHeader>
        <CardBody>
          <StudentAlertsCompact studentId={studentId} alerts={openAlerts} signals={signals} />
        </CardBody>
      </Card>

      {/* Accesos rápidos */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {tabs.map((t) => (
          <Link
            key={t.href}
            href={t.href}
            className="efm-fade-up group flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-primary/40 hover:bg-elevated/60"
            style={{ ['--efm-step' as string]: next() }}
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-primary transition-transform group-hover:scale-105">
              <t.icon className="size-4" />
            </span>
            <span className="text-sm font-medium text-foreground">{t.label}</span>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          {/* Última actividad (feed combinado) */}
          <Card className="efm-fade-up" style={{ ['--efm-step' as string]: next() }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4 text-primary" /> Última actividad
              </CardTitle>
            </CardHeader>
            <CardBody>
              <StudentActivityFeed items={activity} />
            </CardBody>
          </Card>

          {/* Tendencia de peso + medidas */}
          <div className="grid gap-6 md:grid-cols-2">
            <Card className="efm-fade-up" style={{ ['--efm-step' as string]: next() }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" /> Evolución de peso
                </CardTitle>
              </CardHeader>
              <CardBody>
                <WeightTrendChart series={weight.series} goalKg={weight.goalKg} />
              </CardBody>
            </Card>

            <Card className="efm-fade-up" style={{ ['--efm-step' as string]: next() }}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Ruler className="size-4 text-primary" /> Medidas
                </CardTitle>
              </CardHeader>
              <CardBody>
                <MeasurementDeltas first={measurements.first} last={measurements.last} />
              </CardBody>
            </Card>
          </div>
        </div>

        <div className="space-y-6">
          {/* Datos físicos */}
          <Card className="efm-fade-up" style={{ ['--efm-step' as string]: next() }}>
            <CardHeader>
              <CardTitle>Datos físicos</CardTitle>
            </CardHeader>
            <CardBody className="space-y-2 text-sm">
              <Row label="Objetivo" value={sp?.goal} />
              <Row label="Nivel" value={sp?.training_level} />
              <Row label="Altura" value={sp?.height_cm ? `${sp.height_cm} cm` : null} />
              <Row label="Peso inicial" value={weight.firstKg != null ? `${weight.firstKg} kg` : null} />
              <Row label="Peso actual" value={weight.currentKg != null ? `${weight.currentKg} kg` : null} />
              <Row label="Meta" value={weight.goalKg != null ? `${weight.goalKg} kg` : null} />
            </CardBody>
          </Card>

          {/* Planes activos */}
          <Card className="efm-fade-up" style={{ ['--efm-step' as string]: next() }}>
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

          {/* Notas internas */}
          <Card className="efm-fade-up" style={{ ['--efm-step' as string]: next() }}>
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
