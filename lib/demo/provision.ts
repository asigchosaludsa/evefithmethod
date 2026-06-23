import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

const TEMPLATE_EMAIL = 'demo.alumna@evefitmethod.com';
const EXPIRY_HOURS = 3;

export interface DemoCredentials {
  email: string;
  password: string;
}

/**
 * Crea una cuenta de alumna DESECHABLE con una copia de los datos del alumno
 * demo plantilla. Devuelve credenciales para iniciar sesión (single-use).
 * El llamador (route handler) hace el signIn con el token de captcha.
 */
export async function provisionDemoStudent(): Promise<
  { ok: true; creds: DemoCredentials; userId: string } | { ok: false; error: string }
> {
  const admin = createAdminClient();

  // 1) Resolver el id de la plantilla.
  const { data: tpl } = await admin
    .from('profiles')
    .select('id')
    .eq('email', TEMPLATE_EMAIL)
    .maybeSingle();
  if (!tpl) return { ok: false, error: 'La demo no está disponible.' };

  // 2) Crear la cuenta desechable.
  const rand = crypto.randomUUID();
  const email = `demo+${rand}@demo.evefitmethod.com`;
  const password = `Demo!${crypto.randomUUID()}`;
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });
  if (cErr || !created?.user) return { ok: false, error: 'No se pudo crear la sesión demo.' };
  const newId = created.user.id;

  // 3) Fijar perfil (bypass del trigger de rol vía función SECURITY DEFINER).
  const expires = new Date(Date.now() + EXPIRY_HOURS * 3_600_000).toISOString();
  const { error: pErr } = await admin.rpc('set_demo_profile', {
    p_id: newId,
    p_expires: expires,
  });
  if (pErr) {
    await admin.auth.admin.deleteUser(newId);
    return { ok: false, error: 'No se pudo preparar la demo.' };
  }

  // 4) Clonar datos.
  const { error: clErr } = await admin.rpc('clone_demo_student', {
    template_id: tpl.id,
    new_id: newId,
  });
  if (clErr) {
    await admin.auth.admin.deleteUser(newId);
    return { ok: false, error: 'No se pudo preparar la demo.' };
  }

  return { ok: true, creds: { email, password }, userId: newId };
}
