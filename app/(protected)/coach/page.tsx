import Link from 'next/link';
import {
  Activity,
  Apple,
  BarChart3,
  BookOpen,
  Dumbbell,
  Inbox,
  ListChecks,
  Mail,
  TriangleAlert,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { getCoachDashboard } from '@/lib/db/queries/coach';
import { getCoachActivityByDay, getCoachRecentActivity } from '@/lib/db/queries/coach-activity';
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  CardTitle,
  EmptyState,
  PageHeader,
} from '@/components/common';
import { CoachHeroStats } from '@/components/coach/CoachHeroStats';
import { AttentionList } from '@/components/coach/AttentionList';
import { CoachActivityFeed } from '@/components/coach/CoachActivityFeed';
import { CoachActivityChart } from '@/components/coach/CoachActivityChart';

export const metadata = { title: 'Coach Radar' };

const QUICK_LINKS: { label: string; href: string; icon: LucideIcon }[] = [
  { label: 'Alumnas', href: '/coach/students', icon: Users },
  { label: 'Solicitudes', href: '/coach/solicitudes', icon: Inbox },
  { label: 'Nutrición', href: '/coach/nutrition', icon: Apple },
  { label: 'Entrenamientos', href: '/coach/workouts', icon: Dumbbell },
  { label: 'Ejercicios', href: '/coach/exercises', icon: ListChecks },
  { label: 'Contenido', href: '/coach/content', icon: BookOpen },
  { label: 'Plantillas', href: '/coach/plantillas', icon: Mail },
  { label: 'Cuentas', href: '/coach/cuentas', icon: UserCog },
];

export default async function CoachDashboardPage() {
  const profile = await requireCoach();
  const [dashboard, activity, activityByDay] = await Promise.all([
    getCoachDashboard(profile.id),
    getCoachRecentActivity(profile.id, 12),
    getCoachActivityByDay(profile.id, 14),
  ]);

  const firstName = profile.full_name?.split(' ')[0] ?? 'Coach';
  const hasStudents = dashboard.students.length > 0;
  const attentionCount = dashboard.attention.length;

  // Stagger compartido: el hero ocupa los primeros 4 steps.
  let step = 4;
  const next = () => step++;

  return (
    <div className="space-y-8">
      <div className="efm-fade-up" style={{ ['--efm-step' as string]: 0 }}>
        <PageHeader
          eyebrow="Coach Radar"
          title={`Hola, ${firstName}`}
          description="Tu cabina de mando: a quién revisar hoy, tus números y la actividad reciente."
          actions={
            <Button asChild>
              <Link href="/coach/students/invite">
                <UserPlus className="size-4" /> Invitar alumna
              </Link>
            </Button>
          }
        />
      </div>

      <CoachHeroStats stats={dashboard.stats} startStep={1} />

      {!hasStudents ? (
        <EmptyState
          title="Aún no tienes alumnas"
          description="Invita a tu primera alumna para empezar a crear planes y dar seguimiento."
          action={
            <Button asChild>
              <Link href="/coach/students/invite">
                <UserPlus className="size-4" /> Invitar alumna
              </Link>
            </Button>
          }
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-3">
          {/* A quién revisar hoy — el bloque más valioso, ocupa 2 columnas. */}
          <section
            className="efm-fade-up space-y-3 lg:col-span-2"
            style={{ ['--efm-step' as string]: next() }}
          >
            <div className="flex items-end justify-between gap-3">
              <div>
                <h2 className="flex items-center gap-2 font-display text-lg font-semibold text-foreground">
                  <TriangleAlert className="size-5 text-primary" aria-hidden /> A quién revisar hoy
                  {attentionCount > 0 && (
                    <Badge tone="warning">{attentionCount}</Badge>
                  )}
                </h2>
                <p className="text-sm text-muted">Priorizado por urgencia</p>
              </div>
              <Button asChild variant="ghost" size="sm">
                <Link href="/coach/students">Ver todas</Link>
              </Button>
            </div>
            <AttentionList items={dashboard.attention} max={6} />
          </section>

          {/* Mini-gráfico de registros por día. */}
          <Card className="efm-fade-up" style={{ ['--efm-step' as string]: next() }}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="size-4 text-primary" aria-hidden /> Registros por día
              </CardTitle>
            </CardHeader>
            <CardBody>
              <CoachActivityChart data={activityByDay} />
            </CardBody>
          </Card>

          {/* Actividad reciente across alumnas. */}
          <Card className="efm-fade-up lg:col-span-3" style={{ ['--efm-step' as string]: next() }}>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Activity className="size-4 text-primary" aria-hidden /> Actividad reciente
              </CardTitle>
              <Button asChild variant="ghost" size="sm">
                <Link href="/coach/students">Ver alumnas</Link>
              </Button>
            </CardHeader>
            <CardBody>
              <CoachActivityFeed items={activity} />
            </CardBody>
          </Card>
        </div>
      )}

      {/* Accesos rápidos */}
      <section className="space-y-3">
        <h2 className="font-display text-lg font-semibold text-foreground">Accesos rápidos</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {QUICK_LINKS.map((link, i) => (
            <Link
              key={link.href}
              href={link.href}
              className="efm-fade-up group flex items-center gap-3 rounded-lg border border-border bg-surface px-4 py-3 transition-colors hover:border-primary/40 hover:bg-elevated/60"
              style={{ ['--efm-step' as string]: step + i }}
            >
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-elevated text-primary transition-transform group-hover:scale-105">
                <link.icon className="size-4" aria-hidden />
              </span>
              <span className="text-sm font-medium text-foreground">{link.label}</span>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
