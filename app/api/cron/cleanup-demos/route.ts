import { NextResponse } from 'next/server';
import { cleanupExpiredDemos } from '@/lib/demo/provision';

/**
 * Cron de limpieza de sesiones demo expiradas. Vercel Cron lo llama (ver
 * vercel.json) con `Authorization: Bearer ${CRON_SECRET}`. En el plan Hobby de
 * Vercel el cron solo puede correr una vez al día; entre corridas, /api/demo/start
 * también limpia de forma oportunista (ver lib/demo/provision). Fail-safe.
 */
export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = request.headers.get('authorization');
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }
  const deleted = await cleanupExpiredDemos(500);
  return NextResponse.json({ deleted });
}
