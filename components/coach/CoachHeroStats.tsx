import Link from 'next/link';
import { CalendarCheck, ClipboardCheck, Inbox, Users } from 'lucide-react';
import { StatCard } from '@/components/common';
import type { CoachDashboard } from '@/lib/db/queries/coach';

/**
 * Fila "hero" de métricas del cockpit del coach. Cuatro StatCards con íconos y
 * tono semántico; "Solicitudes" enlaza a /coach/solicitudes. Entrada escalonada
 * (efm-fade-up) gobernada por `startStep`.
 */
export function CoachHeroStats({
  stats,
  startStep = 0,
}: {
  stats: CoachDashboard['stats'];
  startStep?: number;
}) {
  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="efm-fade-up" style={{ ['--efm-step' as string]: startStep }}>
        <StatCard label="Alumnas activas" value={stats.activeStudents} icon={Users} tone="primary" />
      </div>
      <div className="efm-fade-up" style={{ ['--efm-step' as string]: startStep + 1 }}>
        <StatCard
          label="Sesiones esta semana"
          value={stats.sessionsThisWeek}
          icon={CalendarCheck}
          tone="success"
          hint="Entrenos completados"
        />
      </div>
      <div className="efm-fade-up" style={{ ['--efm-step' as string]: startStep + 2 }}>
        <StatCard
          label="Comidas por revisar"
          value={stats.pendingReviews}
          icon={ClipboardCheck}
          tone={stats.pendingReviews > 0 ? 'warning' : 'default'}
        />
      </div>
      <Link
        href="/coach/solicitudes"
        className="efm-fade-up rounded-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        style={{ ['--efm-step' as string]: startStep + 3 }}
      >
        <StatCard
          label="Solicitudes pendientes"
          value={stats.pendingRequests}
          icon={Inbox}
          tone={stats.pendingRequests > 0 ? 'warning' : 'default'}
          hint="Ver solicitudes →"
        />
      </Link>
    </div>
  );
}
