import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { renderEmail } from '@/lib/email/render';
import { sendEmail } from '@/lib/email/send';

/**
 * Weekly summary cron. Vercel Cron calls this (see vercel.json) with
 * `Authorization: Bearer ${CRON_SECRET}`. Sends each active student a
 * "tu semana en numeros" email. Fails soft per student.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const sinceIso = new Date(Date.now() - 7 * 86_400_000).toISOString();

  // Active coach<->student links.
  const { data: links } = await admin
    .from('coach_students')
    .select('student_id')
    .eq('status', 'active');
  const studentIds = (links ?? []).map((l) => l.student_id);
  if (studentIds.length === 0) return NextResponse.json({ sent: 0 });

  const { data: students } = await admin
    .from('profiles')
    .select('id, full_name, email')
    .in('id', studentIds);

  let sent = 0;
  for (const s of students ?? []) {
    if (!s.email) continue;
    const { data: logs } = await admin
      .from('workout_logs')
      .select('created_at')
      .eq('student_id', s.id)
      .gte('created_at', sinceIso);
    const entrenos = logs?.length ?? 0;
    const dias = new Set((logs ?? []).map((l) => String(l.created_at).slice(0, 10))).size;
    const adherencia = `${Math.round((dias / 7) * 100)}%`;

    const tpl = await renderEmail('weekly_summary', {
      nombre: s.full_name ?? '',
      entrenos: String(entrenos),
      racha: `${dias} dia${dias === 1 ? '' : 's'}`,
      adherencia,
    });
    if (tpl && (await sendEmail({ to: s.email, subject: tpl.subject, html: tpl.html }))) sent += 1;
  }

  return NextResponse.json({ sent });
}
