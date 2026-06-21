import { CalendarCheck, ClipboardCheck, TriangleAlert, Users } from 'lucide-react';
import { StatCard } from '@/components/common';
import type { CoachDashboard } from '@/lib/db/queries/coach';

export function CoachDashboardStats({ stats }: { stats: CoachDashboard['stats'] }) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <StatCard label="Alumnas activas" value={stats.activeStudents} icon={Users} tone="primary" />
      <StatCard
        label="Alertas abiertas"
        value={stats.openAlerts}
        icon={TriangleAlert}
        tone={stats.openAlerts > 0 ? 'warning' : 'default'}
      />
      <StatCard
        label="Comidas por revisar"
        value={stats.pendingReviews}
        icon={ClipboardCheck}
        tone={stats.pendingReviews > 0 ? 'warning' : 'default'}
      />
      <StatCard label="Entrenos esta semana" value={stats.workoutsThisWeek} icon={CalendarCheck} tone="success" />
    </div>
  );
}
