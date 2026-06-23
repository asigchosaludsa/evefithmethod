import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Cron de limpieza de sesiones demo expiradas. Vercel Cron lo llama (ver
 * vercel.json) con `Authorization: Bearer ${CRON_SECRET}`. Borra (admin) los
 * perfiles is_demo cuyo demo_expires_at ya pasó; el borrado del auth user
 * dispara la cascada auth.users -> profiles -> datos. Fail-safe: si algún
 * borrado falla, la cuenta vive más y se reintenta en la siguiente corrida.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  const admin = createAdminClient();
  const nowIso = new Date().toISOString();
  const { data: expired } = await admin
    .from('profiles')
    .select('id')
    .eq('is_demo', true)
    .lt('demo_expires_at', nowIso);

  let deleted = 0;
  for (const p of expired ?? []) {
    try {
      await admin.auth.admin.deleteUser(p.id);
      deleted += 1;
    } catch {
      // Fail-safe: se reintenta en la siguiente corrida.
    }
  }
  return NextResponse.json({ deleted });
}
