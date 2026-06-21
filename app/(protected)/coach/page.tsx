import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { getCoachDashboard } from '@/lib/db/queries/coach';
import { Button, EmptyState, PageHeader, SectionHeader } from '@/components/common';
import { CoachDashboardStats } from '@/components/coach/CoachDashboardStats';
import { StudentPriorityList } from '@/components/coach/StudentPriorityList';

export const metadata = { title: 'Coach Radar' };

export default async function CoachDashboardPage() {
  const profile = await requireCoach();
  const dashboard = await getCoachDashboard(profile.id);

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Coach Radar"
        title={`Hola, ${profile.full_name?.split(' ')[0] ?? 'Coach'}`}
        description="Esto es lo que necesita tu atención hoy."
        actions={
          <Button asChild>
            <Link href="/coach/students/invite">
              <UserPlus className="size-4" /> Invitar alumna
            </Link>
          </Button>
        }
      />

      <CoachDashboardStats stats={dashboard.stats} />

      {dashboard.students.length === 0 ? (
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
        <section className="space-y-3">
          <SectionHeader
            title="Prioridades de hoy"
            description="Alumnas que necesitan tu revisión"
            actions={
              <Button asChild variant="ghost" size="sm">
                <Link href="/coach/students">Ver todas</Link>
              </Button>
            }
          />
          <StudentPriorityList priorities={dashboard.priorities} />
        </section>
      )}
    </div>
  );
}
