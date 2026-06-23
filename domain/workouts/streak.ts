// domain/workouts/streak.ts
/**
 * Racha de entrenamiento: número de sesiones PROGRAMADAS completadas de forma
 * consecutiva, contando hacia atrás desde hoy. Los días de descanso (no
 * programados) no rompen la racha. Una sesión programada pasada sin completar
 * (saltada o sin registro) sí la rompe. La sesión de HOY, si aún no está
 * completada, no cuenta ni rompe (sigue pendiente).
 */

export interface ScheduledSession {
  dateISO: string; // ISO YYYY-MM-DD
  planDayId: string;
}

type Status = 'completed' | 'skipped' | 'started';

export function currentStreak(
  scheduled: ScheduledSession[],
  statusByKey: Record<string, Status>,
  todayISO: string,
): number {
  const past = scheduled
    .filter((s) => s.dateISO <= todayISO)
    .sort((a, b) => (a.dateISO < b.dateISO ? 1 : a.dateISO > b.dateISO ? -1 : 0)); // desc

  let streak = 0;
  for (const s of past) {
    const status = statusByKey[`${s.planDayId}|${s.dateISO}`];
    if (s.dateISO === todayISO && status !== 'completed') {
      continue; // hoy sigue pendiente: ni cuenta ni rompe
    }
    if (status === 'completed') {
      streak += 1;
    } else {
      break;
    }
  }
  return streak;
}
