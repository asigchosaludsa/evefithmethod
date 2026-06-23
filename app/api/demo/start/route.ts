import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { provisionDemoStudent, cleanupExpiredDemos } from '@/lib/demo/provision';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  // Rate-limit por IP (propio); el captcha lo verifica Supabase en el signIn.
  if (!(await checkRateLimit('demo_start', { max: 5, windowSeconds: 600 }))) {
    return NextResponse.json({ error: 'Demasiados intentos. Intenta más tarde.' }, { status: 429 });
  }

  const body = await request.json().catch(() => ({}));
  const captchaToken = typeof body?.captchaToken === 'string' ? body.captchaToken : undefined;
  if (!captchaToken) {
    return NextResponse.json({ error: 'Falta verificación anti-bot.' }, { status: 400 });
  }

  // Limpieza oportunista de demos expiradas (el cron en Hobby solo corre 1×/día).
  await cleanupExpiredDemos(10);

  const prov = await provisionDemoStudent();
  if (!prov.ok) return NextResponse.json({ error: prov.error }, { status: 503 });

  // Iniciar sesión como la cuenta desechable (Supabase verifica el captcha aquí).
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: prov.creds.email,
    password: prov.creds.password,
    options: { captchaToken },
  });
  if (error) {
    // Evitar cuenta huérfana: si el login falla (p. ej. captcha inválido), borra
    // la cuenta desechable recién provisionada (no esperar al cron).
    try {
      await createAdminClient().auth.admin.deleteUser(prov.userId);
    } catch {}
    return NextResponse.json(
      {
        error: /captcha/i.test(error.message)
          ? 'No pudimos verificarte. Recarga e intenta.'
          : 'No se pudo iniciar la demo.',
      },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, redirect: '/student/today' });
}
