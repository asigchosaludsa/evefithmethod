import { CheckCircle2, Dumbbell, Flag, MinusCircle, Scale, Utensils } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Badge, type BadgeProps } from '@/components/common';
import type { RecentActivityItem } from '@/lib/db/queries/student-recent-activity';
import { formatDateTime } from '@/lib/utils/date';

const MEAL_LABEL: Record<string, string> = {
  breakfast: 'Desayuno',
  lunch: 'Almuerzo',
  dinner: 'Cena',
  snack: 'Snack',
  other: 'Comida',
};

const WORKOUT_LABEL: Record<string, string> = {
  started: 'Entreno iniciado',
  completed: 'Entreno completado',
  skipped: 'Entreno saltado',
};

const REVIEW_TONE: Record<string, BadgeProps['tone']> = {
  reviewed: 'success',
  flagged: 'danger',
  pending: 'neutral',
};

const REVIEW_LABEL: Record<string, string> = {
  reviewed: 'Revisada',
  flagged: 'Marcada',
  pending: 'Por revisar',
};

interface FeedLine {
  icon: LucideIcon;
  iconClass: string;
  title: string;
  badge?: { tone: BadgeProps['tone']; label: string };
}

function lineFor(item: RecentActivityItem): FeedLine {
  if (item.kind === 'workout') {
    const completed = item.workoutStatus === 'completed';
    const skipped = item.workoutStatus === 'skipped';
    return {
      icon: completed ? CheckCircle2 : skipped ? MinusCircle : Dumbbell,
      iconClass: completed ? 'text-success' : skipped ? 'text-muted' : 'text-primary',
      title: WORKOUT_LABEL[item.workoutStatus ?? 'started'] ?? 'Entreno',
    };
  }
  if (item.kind === 'meal') {
    const status = item.reviewStatus ?? 'pending';
    return {
      icon: status === 'flagged' ? Flag : Utensils,
      iconClass: status === 'flagged' ? 'text-danger' : 'text-info',
      title: MEAL_LABEL[item.mealType ?? 'other'] ?? 'Comida',
      badge: { tone: REVIEW_TONE[status] ?? 'neutral', label: REVIEW_LABEL[status] ?? status },
    };
  }
  return {
    icon: Scale,
    iconClass: 'text-warning',
    title: item.weightKg != null ? `Peso · ${item.weightKg} kg` : 'Peso registrado',
  };
}

export function StudentActivityFeed({ items }: { items: RecentActivityItem[] }) {
  if (items.length === 0) {
    return <p className="text-sm text-faint">Sin actividad reciente.</p>;
  }
  return (
    <ul className="space-y-1">
      {items.map((item) => {
        const line = lineFor(item);
        const Icon = line.icon;
        return (
          <li
            key={`${item.kind}-${item.id}`}
            className="flex items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-elevated/60"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-elevated">
              <Icon className={`size-4 ${line.iconClass}`} aria-hidden />
            </span>
            <div className="flex min-w-0 flex-1 items-center justify-between gap-2">
              <span className="truncate text-sm text-foreground">{line.title}</span>
              <div className="flex shrink-0 items-center gap-2">
                {line.badge && <Badge tone={line.badge.tone}>{line.badge.label}</Badge>}
                <span className="tabular text-xs text-faint">{formatDateTime(item.at)}</span>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
