# Demo de alumna en la landing — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Botón en la landing que entra a una demo de alumna en un sandbox efímero (copia desechable de los datos del alumno demo); lo que el visitante haga vive solo en su sesión y se borra al salir / a las ~3h; el demo maestro queda intacto. Más animaciones profesionales en la landing (scroll-reveal de mini-previews + micro-interacciones de botones).

**Architecture:** Una función SQL `clone_demo_student` copia todos los datos de la plantilla a una cuenta desechable. `/api/demo/start` (Turnstile + rate-limit) crea la cuenta, clona, e inicia sesión. Banner "modo demo" + `/api/demo/end` (borra la cuenta) + cron `/api/cron/cleanup-demos` (borra expiradas). Landing: CTA de demo + sección de previews con `Reveal` (IntersectionObserver) y CSS.

**Tech Stack:** Next.js 16 (route handlers + server actions), React 19, TS strict, Supabase (admin client + `@supabase/ssr` cookie client), Zod, Tailwind v4, @marsidev/react-turnstile. Migración vía Management API.

**Convención TS strict + commits:** índice → `T|undefined`; commits en español + `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`; PowerShell sin heredoc (Bash tool o `git commit -F`).

**Se construye en 2 fases:** Fase 1 = sandbox backend (Tasks 1-5), Fase 2 = landing visual (Tasks 6-9).

---

## Estructura de archivos

| Archivo | Responsabilidad | Acción |
|---|---|---|
| `supabase/migrations/0017_demo_sessions.sql` | `is_demo`/`demo_expires_at` + `clone_demo_student()` + índice | Crear |
| `types/database.ts` | `is_demo`/`demo_expires_at` en `Profiles*` | Modificar |
| `lib/demo/provision.ts` | crear cuenta desechable + perfil + clonar (admin) | Crear |
| `app/api/demo/start/route.ts` | provisionar + login + redirect | Crear |
| `app/api/demo/end/route.ts` | borrar cuenta demo + logout | Crear |
| `app/api/cron/cleanup-demos/route.ts` | borrar demos expiradas | Crear |
| `vercel.json` | cron cleanup-demos | Modificar |
| `components/student/DemoBanner.tsx` | banner modo demo | Crear |
| `app/(protected)/layout.tsx` (o AppShell) | montar banner si `is_demo` | Modificar |
| `components/landing/DemoButton.tsx` | Turnstile token → POST /api/demo/start | Crear |
| `components/landing/PreviewPeek.tsx` | mini-previews + sección "Míralo por dentro" | Crear |
| `app/page.tsx` + `components/marketing/Hero.tsx` | CTA demo + sección previews | Modificar |
| `app/globals.css` | micro-interacciones de botones + reveal variants | Modificar |

---

## FASE 1 — Sandbox backend

## Task 1: Migración 0017 (columnas + clone_demo_student)

**Files:** Create `supabase/migrations/0017_demo_sessions.sql`

- [ ] **Step 1: READ exact columns first.** Open `supabase/migrations/0003_core_tables.sql` and confirm the exact column lists for: `student_profiles`, `coach_students`, `nutrition_plans`, `workout_plans`, `workout_plan_days`, `workout_plan_exercises`, `workout_logs`, `workout_log_sets`, `weight_entries`, `body_measurements`, `food_logs`, `food_log_items`, `content_assignments`. Also note added columns: `0013` (`workout_plan_days.weekday`, `workout_plans.weeks`, `workout_logs.session_date`), `0015` (`food_log_items.unit`/`quantity`), `0016` (`student_profiles.goal_weight_kg`). The `clone_demo_student` body below MUST match the real columns — adjust any column name that differs.

- [ ] **Step 2: Write the migration** (idempotent). Use this as the template, correcting column names per Step 1:

```sql
-- 0017_demo_sessions.sql  (idempotente)
alter table public.profiles add column if not exists is_demo boolean not null default false;
alter table public.profiles add column if not exists demo_expires_at timestamptz;
create index if not exists profiles_demo_expiry_idx on public.profiles (demo_expires_at) where is_demo;

-- Clona todos los datos de un estudiante plantilla a new_id (cuenta desechable).
-- SECURITY DEFINER + search_path fijo. No clona progress_photos ni coach_notes.
create or replace function public.clone_demo_student(template_id uuid, new_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into student_profiles (user_id, date_of_birth, age, height_cm, initial_weight_kg, current_weight_kg, goal_weight_kg, goal, training_level, notes)
  select new_id, date_of_birth, age, height_cm, initial_weight_kg, current_weight_kg, goal_weight_kg, goal, training_level, notes
  from student_profiles where user_id = template_id
  on conflict (user_id) do nothing;

  insert into coach_students (coach_id, student_id, status)
  select coach_id, new_id, status from coach_students where student_id = template_id;

  create temp table _np (old uuid, new uuid) on commit drop;
  insert into _np select id, gen_random_uuid() from nutrition_plans where student_id = template_id;
  insert into nutrition_plans (id, coach_id, student_id, title, calories_target, protein_target_g, carbs_target_g, fat_target_g, meals_per_day, notes, status, starts_at, ends_at)
  select m.new, x.coach_id, new_id, x.title, x.calories_target, x.protein_target_g, x.carbs_target_g, x.fat_target_g, x.meals_per_day, x.notes, x.status, x.starts_at, x.ends_at
  from nutrition_plans x join _np m on m.old = x.id where x.student_id = template_id;

  create temp table _wp (old uuid, new uuid) on commit drop;
  insert into _wp select id, gen_random_uuid() from workout_plans where student_id = template_id;
  insert into workout_plans (id, coach_id, student_id, title, focus, level, split_type, estimated_duration_minutes, status, weeks, starts_at, ends_at)
  select m.new, x.coach_id, new_id, x.title, x.focus, x.level, x.split_type, x.estimated_duration_minutes, x.status, x.weeks, x.starts_at, x.ends_at
  from workout_plans x join _wp m on m.old = x.id where x.student_id = template_id;

  create temp table _wpd (old uuid, new uuid) on commit drop;
  insert into _wpd select id, gen_random_uuid() from workout_plan_days where workout_plan_id in (select old from _wp);
  insert into workout_plan_days (id, workout_plan_id, day_number, title, focus, notes, weekday)
  select d.new, wp.new, x.day_number, x.title, x.focus, x.notes, x.weekday
  from workout_plan_days x join _wpd d on d.old = x.id join _wp wp on wp.old = x.workout_plan_id;

  insert into workout_plan_exercises (workout_plan_day_id, exercise_id, sort_order, sets, reps, rest_seconds, tempo, suggested_weight_kg, notes)
  select dm.new, x.exercise_id, x.sort_order, x.sets, x.reps, x.rest_seconds, x.tempo, x.suggested_weight_kg, x.notes
  from workout_plan_exercises x join _wpd dm on dm.old = x.workout_plan_day_id;

  create temp table _wl (old uuid, new uuid) on commit drop;
  insert into _wl select id, gen_random_uuid() from workout_logs where student_id = template_id;
  insert into workout_logs (id, student_id, coach_id, workout_plan_id, workout_plan_day_id, logged_at, status, perceived_effort, notes, session_date)
  select lm.new, new_id, x.coach_id, wp.new, dm.new, x.logged_at, x.status, x.perceived_effort, x.notes, x.session_date
  from workout_logs x join _wl lm on lm.old = x.id
  left join _wp wp on wp.old = x.workout_plan_id
  left join _wpd dm on dm.old = x.workout_plan_day_id
  where x.student_id = template_id;

  insert into workout_log_sets (workout_log_id, exercise_id, set_number, reps_completed, weight_kg, completed, notes)
  select lm.new, x.exercise_id, x.set_number, x.reps_completed, x.weight_kg, x.completed, x.notes
  from workout_log_sets x join _wl lm on lm.old = x.workout_log_id;

  insert into weight_entries (student_id, coach_id, weight_kg, recorded_at, notes)
  select new_id, coach_id, weight_kg, recorded_at, notes from weight_entries where student_id = template_id;

  insert into body_measurements (student_id, coach_id, recorded_at, waist_cm, hip_cm, chest_cm, thigh_cm, arm_cm, notes)
  select new_id, coach_id, recorded_at, waist_cm, hip_cm, chest_cm, thigh_cm, arm_cm, notes from body_measurements where student_id = template_id;

  create temp table _fl (old uuid, new uuid) on commit drop;
  insert into _fl select id, gen_random_uuid() from food_logs where student_id = template_id;
  insert into food_logs (id, student_id, coach_id, nutrition_plan_id, meal_type, logged_at, notes, photo_path, coach_review_status)
  select fm.new, new_id, x.coach_id, npm.new, x.meal_type, x.logged_at, x.notes, null, x.coach_review_status
  from food_logs x join _fl fm on fm.old = x.id
  left join _np npm on npm.old = x.nutrition_plan_id
  where x.student_id = template_id;

  insert into food_log_items (food_log_id, food_item_id, unit, quantity, grams, calories, protein_g, carbs_g, fat_g)
  select fm.new, x.food_item_id, x.unit, x.quantity, x.grams, x.calories, x.protein_g, x.carbs_g, x.fat_g
  from food_log_items x join _fl fm on fm.old = x.food_log_id;

  insert into content_assignments (coach_id, student_id, content_post_id, assigned_at, read_at)
  select coach_id, new_id, content_post_id, assigned_at, read_at from content_assignments where student_id = template_id;
end;
$$;
```

- [ ] **Step 3: Apply via Management API** (token/ref in `OPERATIONS.local.md`; never print/commit it; delete any throwaway script). Verify no `error`.
- [ ] **Step 4: Smoke-test the function** with a throwaway target id in a transaction that you roll back, OR test end-to-end in Task 3. At minimum, run `select proname from pg_proc where proname='clone_demo_student';` to confirm it was created.
- [ ] **Step 5: Commit** — `feat(db): migracion 0017 sesiones demo + clone_demo_student`.

---

## Task 2: Tipos + helper de provisión

**Files:** Modify `types/database.ts`; Create `lib/demo/provision.ts`

- [ ] **Step 1: Types.** In `types/database.ts`, add to `ProfilesRow` (and Insert): `is_demo: boolean` and `demo_expires_at: string | null`. (READ the file to match the pattern.)

- [ ] **Step 2: Provision helper.**

```typescript
// lib/demo/provision.ts
import 'server-only';
import { createAdminClient } from '@/lib/supabase/admin';

const TEMPLATE_EMAIL = 'demo.alumna@evefitmethod.com';
const EXPIRY_HOURS = 3;

export interface DemoCredentials { email: string; password: string }

/**
 * Crea una cuenta de alumna DESECHABLE con una copia de los datos del alumno
 * demo plantilla. Devuelve credenciales para iniciar sesión (single-use).
 * El llamador (route handler) hace el signIn con el token de captcha.
 */
export async function provisionDemoStudent(): Promise<
  { ok: true; creds: DemoCredentials } | { ok: false; error: string }
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

  // 3) Fijar perfil (bypass del trigger de rol identificándose como service_role).
  const expires = new Date(Date.now() + EXPIRY_HOURS * 3_600_000).toISOString();
  const { error: pErr } = await admin.rpc('set_demo_profile', {
    p_id: newId,
    p_expires: expires,
  });
  // Fallback si la rpc no existe: usar SQL directo no es posible con el client;
  // por eso definimos set_demo_profile en la migración (ver nota). Si pErr, limpia.
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

  return { ok: true, creds: { email, password } };
}
```

> **NOTA importante:** el `update` del perfil para fijar `role='student'` choca con el trigger `prevent_role_escalation` cuando NO se ejecuta como `service_role`. El admin client de PostgREST no garantiza `auth.role()='service_role'` para ese trigger. Por eso **añade a la migración 0017 una función `set_demo_profile(p_id uuid, p_expires timestamptz)`** `SECURITY DEFINER` que haga el update del perfil (`full_name`, `role='student'`, `status='active'`, `onboarding_completed=true`, `is_demo=true`, `demo_expires_at=p_expires`, `email`) sin disparar el bloqueo (al ser definer corre como el dueño de la función). Defínela junto a `clone_demo_student` en Task 1 (añádela al SQL). Ejemplo:
> ```sql
> create or replace function public.set_demo_profile(p_id uuid, p_expires timestamptz)
> returns void language sql security definer set search_path = public as $$
>   update public.profiles set full_name='Tú (demo)', role='student', status='active',
>     onboarding_completed=true, is_demo=true, demo_expires_at=p_expires
>   where id = p_id;
> $$;
> ```
> (El trigger `prevent_role_escalation` comprueba `auth.role()`; una función `SECURITY DEFINER` que corre como el rol dueño/postgres evita el bloqueo igual que lo hace el service_role. Verifica en pruebas que el rol queda en 'student'.)

- [ ] **Step 3: Add `clone_demo_student` + `set_demo_profile` to the Database type** (`types/database.ts` Functions section) so the `.rpc(...)` calls typecheck. Match the existing Functions typing pattern (args + returns void).

- [ ] **Step 4: Typecheck** — `npm run typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** — `feat(demo): helper de provision de sesion demo (cuenta + clonado)`.

---

## Task 3: `POST /api/demo/start`

**Files:** Create `app/api/demo/start/route.ts`

- [ ] **Step 1: Route handler**

```typescript
// app/api/demo/start/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import { provisionDemoStudent } from '@/lib/demo/provision';

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
    return NextResponse.json(
      { error: /captcha/i.test(error.message) ? 'No pudimos verificarte. Recarga e intenta.' : 'No se pudo iniciar la demo.' },
      { status: 400 },
    );
  }

  return NextResponse.json({ ok: true, redirect: '/student/today' });
}
```

> El cliente (DemoButton, Task 6) hace `fetch('/api/demo/start', {method:'POST', body: JSON.stringify({captchaToken})})` y luego `window.location.href = json.redirect`. El signIn setea las cookies de sesión en esta respuesta (mismo `createClient` cookie-based que el login).

- [ ] **Step 2: Typecheck + build** — `npm run typecheck && npm run build`. Expected: PASS.
- [ ] **Step 3: Commit** — `feat(demo): endpoint /api/demo/start (provision + login)`.

---

## Task 4: `/api/demo/end` + DemoBanner

**Files:** Create `app/api/demo/end/route.ts`, `components/student/DemoBanner.tsx`; Modify the protected layout.

- [ ] **Step 1: End route**

```typescript
// app/api/demo/end/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) {
    const { data: profile } = await supabase.from('profiles').select('is_demo').eq('id', user.id).maybeSingle();
    await supabase.auth.signOut();
    if (profile?.is_demo) {
      // Borrar la cuenta desechable (cascada borra todos sus datos).
      try { await createAdminClient().auth.admin.deleteUser(user.id); } catch {}
    }
  }
  const url = new URL('/', request.url);
  return NextResponse.redirect(url, { status: 303 });
}
```

- [ ] **Step 2: DemoBanner** (`components/student/DemoBanner.tsx`): fixed top bar, scarlet-tinted, text "Estás explorando EveFit como alumna · lo que hagas aquí no se guarda" + a form posting to `/api/demo/end` with a "Salir de la demo" button. Server component (it's a `<form action="/api/demo/end" method="post">`). Keep it accessible and above content (account for the RouteProgress bar z-index).

- [ ] **Step 3: Mount conditionally.** In the protected layout (`app/(protected)/layout.tsx` or the shell that loads the profile), fetch `getCurrentProfile()` (or reuse what's there) and render `<DemoBanner />` when `profile?.is_demo`. Add top padding when shown so it doesn't cover content. READ the layout first to wire it cleanly.

- [ ] **Step 4: Typecheck + build.** Commit — `feat(demo): banner de modo demo + /api/demo/end`.

---

## Task 5: Cron de limpieza

**Files:** Create `app/api/cron/cleanup-demos/route.ts`; Modify `vercel.json`

- [ ] **Step 1: Cron route** (mirror `app/api/cron/weekly/route.ts` auth):

```typescript
// app/api/cron/cleanup-demos/route.ts
import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

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
    try { await admin.auth.admin.deleteUser(p.id); deleted += 1; } catch {}
  }
  return NextResponse.json({ deleted });
}
```

> Borrar el auth user dispara la cascada `auth.users → profiles → datos`. (Verifica que `profiles.id` referencia `auth.users(id) on delete cascade`, lo cual ya está en el esquema.)

- [ ] **Step 2: vercel.json** — añade al array `crons`:
```json
{ "path": "/api/cron/cleanup-demos", "schedule": "0 * * * *" }
```
(cada hora.)

- [ ] **Step 3: Typecheck + build.** Commit — `feat(demo): cron de limpieza de sesiones demo expiradas`.

---

## FASE 2 — Landing visual

## Task 6: DemoButton (Turnstile → start)

**Files:** Create `components/landing/DemoButton.tsx`; Modify `components/marketing/Hero.tsx`

- [ ] **Step 1: DemoButton** (client). Renders the existing Turnstile widget (`@marsidev/react-turnstile`, site key `NEXT_PUBLIC_TURNSTILE_SITE_KEY`) — preferably in a small popover/inline so a token is obtained, then on click POSTs `{captchaToken}` to `/api/demo/start` and on `{ok}` does `window.location.href = redirect`. Show a loading state ("Preparando tu demo…") and an error message on failure. Match the button styling used elsewhere (`Button` from common). READ an existing Turnstile usage (login/solicitud) to mirror widget setup.

- [ ] **Step 2: Add the CTA to the Hero.** READ `components/marketing/Hero.tsx`; add a secondary button **"Echa un vistazo — entra como alumna"** next to the primary CTA, rendered via `DemoButton`. Keep the hero layout clean.

- [ ] **Step 3: Typecheck + build.** Commit — `feat(landing): boton para entrar a la demo como alumna`.

---

## Task 7: Mini-previews + sección "Míralo por dentro"

**Files:** Create `components/landing/PreviewPeek.tsx`; Modify `app/page.tsx`

- [ ] **Step 1: Mini-previews.** Build small, faithful, STATIC mock previews (SVG/HTML, design tokens) of: (a) "sesión completada" ring + streak, (b) calendario semana con ✓/✗, (c) dashboard con anillo de meta + línea de peso, (d) calendario de comidas con estados, (e) galería de fotos / antes-después. Each is a compact card (~ phone-ratio or square). No live data — coherent mock values. Keep each small and crisp.

- [ ] **Step 2: Section.** A `PreviewPeek` section "Míralo por dentro" with a short heading, the mini-previews in a staggered layout wrapped in `Reveal` (existing) so they fade+rise on scroll, one larger featured preview, and a repeated `DemoButton` CTA. Insert it in `app/page.tsx` between the features section and the CTA band.

- [ ] **Step 3: Scroll polish.** Extend the reveal: add per-item stagger (e.g. `style={{ '--reveal-delay': ... }}`) and a zoom-in variant. Ensure content is visible by default (reduced-motion / no-JS) — the existing `[data-reveal]` CSS already gates hidden state behind `no-preference`; follow that pattern for any new variant in `globals.css`.

- [ ] **Step 4: Typecheck + build.** Commit — `feat(landing): seccion 'Míralo por dentro' con mini-previews animadas`.

---

## Task 8: Micro-interacciones de botones

**Files:** Modify `app/globals.css` (+ apply classes on landing CTAs)

- [ ] **Step 1: Button polish CSS.** Add tasteful, reduced-motion-safe utilities in `globals.css`: a `:active` scale, a hover "sheen" sweep (a pseudo-element gradient that translates across), a scarlet-tinted shadow on hover for primary CTAs, and a subtle `pulse` for the demo CTA. Use `ease-out` curves, no bounce. Gate motion behind `prefers-reduced-motion: no-preference`.
- [ ] **Step 2: Apply** the classes to the landing CTAs (hero primary + demo button + final CTA). Don't over-apply (avoid every button pulsing).
- [ ] **Step 3: Typecheck + build.** Commit — `feat(landing): micro-interacciones pro en botones`.

---

## Task 9: Verificación final + deploy

- [ ] **Step 1: Suite** — `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` (todos verdes).
- [ ] **Step 2: Prueba manual** (preferible contra el deploy de preview o local):
  1. Landing → "entra como alumna" → entra a `/student/today` con datos clonados + banner demo.
  2. Registrar/editar algo en la demo.
  3. "Salir de la demo" → vuelve a la landing; re-entrar crea OTRA copia limpia (no se ven los cambios anteriores).
  4. Verificar (como coach o por query) que el alumno demo PLANTILLA sigue intacto.
  5. Llamar al cron de cleanup con el `CRON_SECRET` y ver que borra expiradas (puedes fijar `demo_expires_at` en el pasado para una cuenta de prueba).
- [ ] **Step 3: Push + deploy** — `git push origin main`; deploy a Vercel (ver `OPERATIONS.local.md`). Confirmar que el cron quedó registrado.

---

## Self-Review (cobertura del spec)
- **Sandbox efímero (copia desechable):** Tasks 1 (clone fn), 2 (provision), 3 (start).
- **No afecta la plantilla / aislamiento:** clone a `new_id`; RLS por estudiante; Task 9 lo verifica.
- **Se borra al salir / a las ~3h:** Task 4 (end) + Task 5 (cron + demo_expires_at).
- **Abuso:** Task 3 (rate-limit) + Task 6 (Turnstile, verificado por Supabase en signIn).
- **Banner modo demo:** Task 4.
- **Landing CTA + previews + animaciones:** Tasks 6, 7, 8.
- **Verificación + deploy:** Task 9.

Riesgo principal: la función `clone_demo_student`/`set_demo_profile` debe coincidir con las columnas reales (Task 1 Step 1) y el rol debe quedar 'student' pese al trigger (set_demo_profile SECURITY DEFINER). Verificar en Task 3/9. Tipos `is_demo`/`demo_expires_at` consistentes (Task 2) y rpc tipadas. Sin placeholders.
