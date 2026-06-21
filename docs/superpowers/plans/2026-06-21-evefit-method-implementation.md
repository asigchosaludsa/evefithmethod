# EveFit Method Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking. This plan is executed via **multi-agent workflows** (Ultracode): phases run in dependency order; within a phase, independent tasks fan out in parallel.

**Goal:** Build the complete EveFit Method web platform — a responsive fitness + nutrition coaching SaaS (coach + student portals) on Next.js 15 + Supabase — production-architected, with the B3 "Acero & Escarlata" dark design system, ready to deploy to GitHub + Vercel.

**Architecture:** Single Next.js App Router app. Server Components by default; Server Actions for sensitive mutations. Supabase (Auth + Postgres + Storage) via `@supabase/ssr`. Pure-TS domain layer (`domain/`) tested with Vitest, decoupled from UI. RLS on every private table is the real permission boundary; the UI never decides permissions.

**Tech Stack:** Next.js 15, React 19, TypeScript (strict), Tailwind v4, Radix primitives, React Hook Form + Zod, `@supabase/ssr`, Vitest, ESLint + Prettier.

**Source spec:** `docs/superpowers/specs/2026-06-21-evefit-method-design.md`

---

## Global Conventions (every task follows these)

- **Paths** are relative to repo root `C:\EveFitMethod`.
- **Commits:** conventional commits; commit after each task. Footer: `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>`.
- **TDD** applies to the `domain/` layer (pure functions): write failing test → run (fail) → implement → run (pass) → commit. UI/pages are verified by `typecheck` + `build` + manual acceptance.
- **No secrets** committed. Only `NEXT_PUBLIC_*` reach the client.
- **Design:** apply `emil-design-eng` + `design-taste-frontend` to all UI. Use design tokens from Task 4 — never hardcode hex values in components.
- **Verification gates:** `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build` must pass before a phase is considered done.

---

## File Structure (decomposition lock-in)

```
package.json, tsconfig.json, next.config.ts, postcss.config.mjs, eslint.config.mjs, .prettierrc, vitest.config.ts, .env.example, .gitignore, middleware.ts
app/
  layout.tsx, page.tsx (marketing landing), globals.css, not-found.tsx
  (public)/{login,register,accept-invitation,forgot-password,reset-password,update-password,terms,privacy,disclaimer}/page.tsx
  auth/callback/route.ts, auth/auth-code-error/page.tsx, auth/confirm/route.ts, auth/logout/route.ts
  onboarding/page.tsx
  (protected)/layout.tsx
  (protected)/coach/... , (protected)/student/...
  api/health/route.ts, api/webhooks/route.ts
components/{common,forms,auth,coach,student,navigation}/*.tsx
lib/supabase/{client,server,middleware,admin}.ts
lib/auth/{require-auth,roles,redirects,actions}.ts
lib/db/{queries,mutations}/*.ts
lib/utils/{cn,format,url}.ts
domain/{nutrition,workouts,progress,alerts}/{calculations,schemas,types}.ts (+ *.test.ts)
types/{database,app}.ts
supabase/migrations/0001..0006_*.sql, supabase/seed.sql, supabase/storage-policies.sql
docs/*.md
```

---

## PHASE 1 — Project Foundation

### Task 1.1: Scaffold Next.js app
**Files:** `package.json`, `tsconfig.json`, `next.config.ts`, `postcss.config.mjs`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1:** Scaffold into the existing (non-empty) repo without clobbering `docs/`, `.gitignore`, `.git`. Run:
```bash
npx create-next-app@latest evefit-tmp --typescript --app --tailwind --eslint --src-dir=false --import-alias "@/*" --no-turbopack --use-npm
```
Then move generated files from `evefit-tmp/` into repo root (merge, keeping our `.gitignore` and `docs/`), and delete `evefit-tmp/`. If `create-next-app` refuses interactive flags in this environment, scaffold in a temp dir and copy.
- [ ] **Step 2:** Verify `npm run dev` boots and `npm run build` passes on the blank app.
- [ ] **Step 3:** Add scripts to `package.json`: `"typecheck": "tsc --noEmit"`, `"test": "vitest run"`, `"test:watch": "vitest"`.
- [ ] **Step 4:** Set `tsconfig.json` `"strict": true`, `"noUncheckedIndexedAccess": true`.
- [ ] **Step 5:** Commit: `chore: scaffold Next.js 15 + Tailwind app`.

### Task 1.2: Tooling — Prettier, ESLint, Vitest
**Files:** `.prettierrc`, `eslint.config.mjs`, `vitest.config.ts`, `package.json`

- [ ] **Step 1:** Add dev deps: `npm i -D prettier vitest @vitejs/plugin-react vite-tsconfig-paths`.
- [ ] **Step 2:** `.prettierrc`:
```json
{ "semi": true, "singleQuote": true, "trailingComma": "all", "printWidth": 100 }
```
- [ ] **Step 3:** `vitest.config.ts`:
```ts
import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: { environment: 'node', include: ['domain/**/*.test.ts'], globals: true },
});
```
- [ ] **Step 4:** Verify: create `domain/_smoke.test.ts` with `it('runs', () => expect(1).toBe(1))`, run `npm run test` → PASS, then delete it.
- [ ] **Step 5:** Commit: `chore: add prettier, eslint config, vitest`.

### Task 1.3: Runtime env config + `.env.example`
**Files:** `.env.example`, `lib/utils/url.ts`, `lib/env.ts`

- [ ] **Step 1:** `.env.example` (exact contents from spec §13).
- [ ] **Step 2:** `lib/env.ts` — read & validate required env at module load (throw clear error if missing in server context). Accept `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` OR legacy `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
- [ ] **Step 3:** `lib/utils/url.ts` — `getURL(path = '')`:
```ts
export function getURL(path = ''): string {
  let url =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.NEXT_PUBLIC_VERCEL_URL ??
    'http://localhost:3000';
  if (!url.startsWith('http')) url = `https://${url}`;
  url = url.replace(/\/+$/, '');
  return `${url}${path.startsWith('/') ? path : `/${path}`}`.replace(/\/$/, '') || url;
}
```
- [ ] **Step 4:** Commit: `feat: env config and getURL helper`.

---

## PHASE 2 — Supabase Clients & Base Types (depends on Phase 1)

### Task 2.1: Supabase SSR clients
**Files:** `lib/supabase/client.ts`, `lib/supabase/server.ts`, `lib/supabase/middleware.ts`, `lib/supabase/admin.ts`, `middleware.ts`

- [ ] **Step 1:** `npm i @supabase/ssr @supabase/supabase-js`.
- [ ] **Step 2:** `client.ts` — `createBrowserClient(url, publishableKey)` typed with `Database`.
- [ ] **Step 3:** `server.ts` — `createClient()` using `cookies()` from `next/headers` per `@supabase/ssr` SSR pattern (getAll/setAll).
- [ ] **Step 4:** `middleware.ts` (lib) — `updateSession(request)` refreshing tokens; root `middleware.ts` wires it with a matcher excluding static assets.
- [ ] **Step 5:** `admin.ts` — server-only client using `SUPABASE_SERVICE_ROLE_KEY`/`SUPABASE_SECRET_KEY`; throw if imported in a client bundle.
- [ ] **Step 6:** Commit: `feat: supabase ssr clients + session middleware`.

### Task 2.2: Database & app types
**Files:** `types/database.ts`, `types/app.ts`

- [ ] **Step 1:** `types/database.ts` — hand-written `Database` type covering all 25 tables (Row/Insert/Update) matching the migrations in Phase 3. (Can be regenerated later via `supabase gen types`.)
- [ ] **Step 2:** `types/app.ts` — domain enums/unions: `Role = 'coach'|'student'|'admin'`, `AccountStatus`, `MealType`, `PlanStatus`, `ReviewStatus`, `AlertSeverity`, etc., plus convenience types (`Profile`, `StudentWithProfile`).
- [ ] **Step 3:** `npm run typecheck` → PASS. Commit: `feat: database and app types`.

---

## PHASE 3 — Database: Migrations, RLS, Storage, Seed (depends on Phase 2 types as contract)

> SQL lives in `supabase/migrations/`. Numbered and applied in order. Full field definitions per spec §6 / source prompt §18.

### Task 3.1: Extensions + helper functions + roles
**Files:** `supabase/migrations/0001_extensions.sql`, `0002_helpers_roles.sql`

- [ ] **Step 1:** `0001`: `create extension if not exists pgcrypto;` (for `gen_random_uuid`).
- [ ] **Step 2:** `0002`: helper functions, all `security definer` with `set search_path = public, auth`:
```sql
create or replace function public.current_user_role() returns text
language sql stable security definer set search_path = public as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_coach(uid uuid default auth.uid()) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles where id = uid and role = 'coach');
$$;
-- is_student(uid), is_admin(uid) follow the same shape.

create or replace function public.coach_has_student(coach uuid, student uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists(
    select 1 from public.coach_students
    where coach_id = coach and student_id = student and status = 'active'
  );
$$;
```
- [ ] **Step 3:** Commit: `feat(db): extensions + RLS helper functions`.

### Task 3.2: Core tables
**Files:** `supabase/migrations/0003_core_tables.sql`

- [ ] **Step 1:** Create all 25 tables with exact fields/constraints/FKs from spec §6 (profiles → coach_profiles → student_profiles → coach_students → invitations → nutrition_* → food_* → workout_* → exercises → weight_entries → body_measurements → progress_photos → content_* → coach_notes → student_checkins → alerts → auth_events). `profiles.id` references `auth.users(id) on delete cascade`.
- [ ] **Step 2:** Add `unique(coach_id, student_id)` on `coach_students`; indexes on every `coach_id`, `student_id`, `*_id` FK, and on `food_logs.logged_at`, `weight_entries.recorded_at`.
- [ ] **Step 3:** Add `updated_at` trigger function `set_updated_at()` + triggers on all tables with `updated_at`.
- [ ] **Step 4:** Commit: `feat(db): core schema (25 tables, indexes, updated_at triggers)`.

### Task 3.3: RLS policies
**Files:** `supabase/migrations/0004_rls_policies.sql`

- [ ] **Step 1:** `alter table ... enable row level security;` on all private tables.
- [ ] **Step 2:** Policies per spec §7 / prompt §19. Representative pattern (`profiles`):
```sql
create policy "own profile - select" on public.profiles for select
  using (id = auth.uid() or is_admin() or coach_has_student(auth.uid(), id));
create policy "own profile - update" on public.profiles for update
  using (id = auth.uid()) with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));
```
(Role-change blocked via the `with check` comparing to current role.) Apply analogous policies to every table: students see only own rows; coaches see rows for assigned students via `coach_has_student`; admins see all.
- [ ] **Step 3:** Commit: `feat(db): row level security policies for all tables`.

### Task 3.4: Triggers (new user) + Storage policies + Seed
**Files:** `supabase/migrations/0006_triggers.sql`, `supabase/storage-policies.sql`, `supabase/seed.sql`

- [ ] **Step 1:** `handle_new_user()` trigger on `auth.users`:
```sql
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, status, onboarding_completed)
  values (new.id, new.email, coalesce(new.raw_user_meta_data->>'full_name',''), null, 'pending', false)
  on conflict (id) do nothing;
  return new;
end; $$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();
```
- [ ] **Step 2:** `storage-policies.sql`: buckets `food-photos`, `progress-photos`, `exercise-videos`, `avatars` (private except avatars optionally public); policies so a student reads/writes only their own folder and the assigned coach can read.
- [ ] **Step 3:** `seed.sql`: 12 public `food_items`, 10 global `exercises`, 5 `content_posts` (per prompt §28). Document that coach/student users are created via Auth then promoted (no fake auth.users in seed).
- [ ] **Step 4:** Commit: `feat(db): new-user trigger, storage policies, seed data`.

---

## PHASE 4 — Design System (depends on Phase 1; parallel with Phase 3)

### Task 4.1: Tokens, fonts, Tailwind theme
**Files:** `app/globals.css`, `app/layout.tsx`, `lib/utils/cn.ts`

- [ ] **Step 1:** `npm i clsx tailwind-merge`; `cn.ts` exports `cn(...)`.
- [ ] **Step 2:** `next/font`: load Archivo (display) + Inter (body) self-hosted; expose CSS vars `--font-display`, `--font-sans`.
- [ ] **Step 3:** `globals.css` — Tailwind v4 `@theme` with B3 tokens (spec §4): colors (`--color-bg`, `--color-surface`, `--color-elevated`, `--color-border`, `--color-primary`=#FF3B47, `--color-primary-pressed`, text colors, semantic alert colors), radii (8/10/14), and base dark `body` styles. Set `color-scheme: dark`.
- [ ] **Step 4:** Commit: `feat(ui): B3 design tokens, fonts, dark theme`.

### Task 4.2: Common components
**Files:** `components/common/*.tsx`

- [ ] **Step 1:** Build (applying `emil-design-eng`): `PageHeader`, `SectionHeader`, `StatCard`, `DataTable` (collapses to cards on mobile), `EmptyState`, `LoadingState`, `ErrorState`, `ConfirmDialog` (Radix), `FormField`, `SubmitButton` (pending state), `RoleGuard`, `ResponsiveShell`. Plus primitives: `Button`, `Input`, `Select`, `Textarea`, `Badge`, `Card`, `ProgressRing` (the macro ring), `Toast`.
- [ ] **Step 2:** `npm run typecheck` + `npm run build` PASS. Commit: `feat(ui): common component library`.

---

## PHASE 5 — Domain Layer (TDD) (depends on Phase 2 types)

> Pure TS. Strict TDD. Each function: failing test → implement → pass → commit. Below are the concrete test cases; implement minimally to satisfy them.

### Task 5.1: Nutrition calculations + schemas
**Files:** `domain/nutrition/{types,calculations,schemas}.ts` + `domain/nutrition/calculations.test.ts`

- [ ] **Step 1 (test):**
```ts
import { calculateFoodMacros, calculateMealTotals, calculateMacroProgress, generateMacroRescueSuggestion, calculateNutritionAdherence } from './calculations';

test('calculateFoodMacros scales per 100g', () => {
  const f = { calories_per_100g: 165, protein_per_100g: 31, carbs_per_100g: 0, fat_per_100g: 3.6 };
  expect(calculateFoodMacros(f, 200)).toEqual({ calories: 330, protein_g: 62, carbs_g: 0, fat_g: 7.2 });
});
test('calculateMealTotals sums items', () => {
  expect(calculateMealTotals([
    { calories: 100, protein_g: 10, carbs_g: 5, fat_g: 2 },
    { calories: 50, protein_g: 4, carbs_g: 3, fat_g: 1 },
  ])).toEqual({ calories: 150, protein_g: 14, carbs_g: 8, fat_g: 3 });
});
test('calculateMacroProgress returns pct + remaining', () => {
  expect(calculateMacroProgress(1420, 1800)).toEqual({ consumed: 1420, target: 1800, remaining: 380, pct: 79 });
});
test('macro rescue suggests protein foods when protein is short', () => {
  const s = generateMacroRescueSuggestion({ protein_g: 40, carbs_g: 5, fat_g: 5, calories: 300 });
  expect(s.focus).toBe('protein');
  expect(s.foods).toEqual(expect.arrayContaining(['Yogur griego', 'Pollo', 'Atún']));
});
test('adherence is 0..100 clamped', () => {
  expect(calculateNutritionAdherence({ calories: 1800, protein_g: 120 }, { calories: 1800, protein_g: 120 }).score).toBe(100);
});
```
- [ ] **Step 2:** Run `npm run test` → FAIL.
- [ ] **Step 3:** Implement the functions (rounding to 1 decimal; `pct = round(consumed/target*100)`; rescue rules per spec §9). Add Zod schemas in `schemas.ts` for nutrition plan + food log.
- [ ] **Step 4:** Run `npm run test` → PASS. Commit: `feat(domain): nutrition calculations + schemas (TDD)`.

### Task 5.2: Workouts
**Files:** `domain/workouts/{types,calculations,schemas}.ts` + test

- [ ] **Step 1 (test):**
```ts
import { calculateWorkoutVolume, calculateWorkoutCompletion, calculateWeeklyWorkoutAdherence } from './calculations';
test('volume = sets*reps*weight', () => {
  expect(calculateWorkoutVolume([{ reps_completed: 10, weight_kg: 40 }, { reps_completed: 8, weight_kg: 40 }])).toBe(720);
});
test('completion pct from completed sets', () => {
  expect(calculateWorkoutCompletion([{ completed: true }, { completed: false }, { completed: true }])).toBe(67);
});
test('weekly adherence = completed/assigned', () => {
  expect(calculateWeeklyWorkoutAdherence(3, 4)).toBe(75);
});
```
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement + Zod schemas (workout plan, workout log). **Step 4:** Run → PASS. Commit: `feat(domain): workout calculations + schemas (TDD)`.

### Task 5.3: Progress
**Files:** `domain/progress/{types,calculations,schemas}.ts` + test

- [ ] **Step 1 (test):**
```ts
import { calculateWeightChange, calculateWeeklyWeightTrend } from './calculations';
test('weight change delta + direction', () => {
  expect(calculateWeightChange(68, 70)).toEqual({ delta: -2, direction: 'down' });
});
test('weekly trend averages last entries', () => {
  const t = calculateWeeklyWeightTrend([{ weight_kg: 70, recorded_at: '2026-06-01' }, { weight_kg: 69, recorded_at: '2026-06-08' }]);
  expect(t.direction).toBe('down');
});
```
- [ ] **Step 2:** FAIL → **Step 3:** implement + schemas (weight, measurements) → **Step 4:** PASS. Commit: `feat(domain): progress calculations + schemas (TDD)`.

### Task 5.4: Alerts (rule engine)
**Files:** `domain/alerts/{types,rules}.ts` + test

- [ ] **Step 1 (test):**
```ts
import { detectNoFoodLogs, detectLowProteinAdherence, detectMissedWorkouts } from './rules';
test('no food logs in N days flags warning', () => {
  expect(detectNoFoodLogs({ lastFoodLogAt: '2026-06-10' }, '2026-06-15', 3)?.severity).toBe('warning');
});
test('low protein adherence flags', () => {
  expect(detectLowProteinAdherence(55)?.type).toBe('low_protein');
});
```
- [ ] **Step 2:** FAIL → **Step 3:** implement all 6 detectors returning `Alert | null` → **Step 4:** PASS. Commit: `feat(domain): alert rule engine (TDD)`.

---

## PHASE 6 — Auth (depends on Phases 2, 3, 4)

### Task 6.1: Auth guards & role redirect
**Files:** `lib/auth/{roles,require-auth,redirects}.ts`
- [ ] Implement `getCurrentProfile()`, `requireAuth()`, `requireRole()`, `requireCoach()`, `requireStudent()`, `assertCoachOwnsStudent()`, `redirectUserByRole(profile)`, `validateSafeRedirect(next)` (relative-only). Typecheck PASS. Commit.

### Task 6.2: Auth actions (server) + social
**Files:** `lib/auth/actions.ts`
- [ ] `signInWithEmail`, `signUpWithEmail`, `signInWithGoogle/Facebook/Apple` (OAuth `redirectTo = getURL('/auth/callback')`), `signOut`, `resetPassword`, `updatePassword`. Validate with Phase 5 Zod schemas. Commit.

### Task 6.3: Callback, confirm, logout routes
**Files:** `app/auth/callback/route.ts`, `app/auth/confirm/route.ts`, `app/auth/logout/route.ts`, `app/auth/auth-code-error/page.tsx`
- [ ] Callback exchanges `code`→session, validates `next`, `redirectUserByRole`; error→`/auth/auth-code-error`. Logout signs out + clears cookies + redirects `/login`. Commit.

### Task 6.4: Invitation accept flow (server action)
**Files:** `lib/db/mutations/invitations.ts`, used by `/accept-invitation`
- [ ] Coach creates invitation (store `token_hash` = sha256 of random token; show raw link once). Accept: validate token+expiry+status via secure RPC → create auth user (admin) → profile(role=student) → student_profile → coach_students → mark accepted. No email-existence leak. Commit.

---

## PHASE 7 — Public Site & Auth Pages (depends on Phase 4, 6)

### Task 7.1: Marketing landing + legal + disclaimer
**Files:** `app/page.tsx`, `app/(public)/{terms,privacy,disclaimer}/page.tsx`, `components/navigation/PublicNav.tsx`
- [ ] Landing in B3 style (hero, value prop "sabe qué hacer hoy / qué revisar hoy", CTA to login). Legal pages + the exact health disclaimer text from spec §30. Commit.

### Task 7.2: Auth pages
**Files:** `app/(public)/{login,register,accept-invitation,forgot-password,reset-password,update-password}/page.tsx`, `components/auth/*` (`LoginForm`, `RegisterForm`, `OAuthButtons`, `ForgotPasswordForm`, `ResetPasswordForm`, `OnboardingForm`, `LogoutButton`), `app/onboarding/page.tsx`
- [ ] Login: email/password + 3 OAuth buttons + links. Register: full validation incl. terms/privacy/disclaimer checkboxes → "revisa tu correo". Onboarding completes profile. Commit per page-group.

---

## PHASE 8 — Coach Portal (depends on Phase 7)

### Task 8.1: Protected layout + coach navigation
**Files:** `app/(protected)/layout.tsx`, `components/navigation/{CoachSidebar,MobileNav,UserMenu}.tsx`
- [ ] Server layout calls `requireAuth`; renders role-appropriate shell. Commit.

### Task 8.2: Coach Radar dashboard
**Files:** `app/(protected)/coach/page.tsx`, `components/coach/{CoachDashboardStats,StudentPriorityList,AlertList}.tsx`, `lib/db/queries/coach-dashboard.ts`
- [ ] Stats (active students, open alerts, pending food reviews, workouts this week, avg adherence), today's priorities computed via Phase 5 alert rules. Commit.

### Task 8.3: Students list + detail + sub-pages
**Files:** `app/(protected)/coach/students/**`, `components/coach/{StudentCard,StudentTable,StudentDetailSummary,CoachNotesPanel}.tsx`, `lib/db/queries/students.ts`
- [ ] List (filter/search/sort), detail (profile, active plans, recent logs, weight, measurements, photos, notes, alerts, quick actions), `/nutrition` `/workouts` `/progress` `/notes` sub-pages. `assertCoachOwnsStudent` on every read. Commit per sub-feature.

### Task 8.4: Nutrition, Workouts, Exercises, Content, Invite, Settings
**Files:** `app/(protected)/coach/{nutrition,workouts,exercises,content,students/invite,settings}/**` + forms `NutritionPlanForm`, `WorkoutPlanForm`, `ExerciseForm`, `ContentPostForm`, `InviteStudentForm`, `FoodLogReviewList`
- [ ] CRUD via Server Actions validated with Zod; mark food logs reviewed/flagged; assign plans/content. Commit per area.

---

## PHASE 9 — Student Portal (depends on Phase 7; parallel with Phase 8)

### Task 9.1: Today
**Files:** `app/(protected)/student/today/page.tsx` + `app/(protected)/student/page.tsx` (redirect), `components/student/{TodaySummary,MacroProgress}.tsx`, `lib/db/queries/student-today.ts`
- [ ] Greeting, active plan, calorie/macro goals vs consumed (ProgressRing), today's workout, next action, assigned tip, last weight. Commit.

### Task 9.2: Nutrition + Log meal + Macro Rescue
**Files:** `app/(protected)/student/meals/**`, `components/student/{FoodLogForm,FoodLogItemsTable,MacroRescuePanel}.tsx`, `lib/db/mutations/food-logs.ts`
- [ ] Meal type, food search, grams → live macro calc (Phase 5), multi-item, optional photo upload (Storage), notes, day total + remaining, Macro Rescue suggestions. Commit.

### Task 9.3: Workout + log
**Files:** `app/(protected)/student/workout/page.tsx`, `components/student/{WorkoutTodayPanel,WorkoutLogForm}.tsx`, `lib/db/mutations/workout-logs.ts`
- [ ] View assigned day; record weight/reps/sets-completed, perceived effort (1–10), notes; video-pending state. Commit.

### Task 9.4: Progress + Content + Profile
**Files:** `app/(protected)/student/{progress,content,profile}/**`, `components/student/{ProgressEntryForm,ProgressHistory,AssignedContentList}.tsx`
- [ ] Weight/measurements entry + history, progress-photo upload, weekly summary; assigned tips filter + mark read; profile edit + avatar + disclaimer + logout. Commit.

---

## PHASE 10 — API + Docs + Verification (depends on all)

### Task 10.1: API routes
**Files:** `app/api/health/route.ts`, `app/api/webhooks/route.ts`
- [ ] Health returns `{status:'ok'}`; webhooks is a documented placeholder (405 for unsupported). Commit.

### Task 10.2: Documentation
**Files:** `README.md`, `CLAUDE.md`, `docs/{AUTH_SETUP,EMAIL_SETUP,DATABASE_SCHEMA,SECURITY,STORAGE_SETUP,PRODUCT_FLOWS,GITHUB_SETUP,VERCEL_DEPLOYMENT,DOMAIN_SETUP,NEXT_STEPS}.md`
- [ ] Write all docs per spec §38 with the exact Supabase Redirect URLs, OAuth provider steps, SMTP/DNS, GitHub/Vercel/domain walkthroughs, security checklist. Commit.

### Task 10.3: Full verification
- [ ] Run `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`. Fix all errors. Commit: `chore: green lint/typecheck/test/build`.

---

## PHASE 11 — Guided Deploy (interactive, with the user)
GitHub push → create Supabase project + run migrations + create buckets → configure OAuth providers → import to Vercel + env vars → buy/connect `evefitmethod.com` + `app.` + `www.` → update Supabase Site URL & Redirect URLs → smoke-test auth + RLS in production.

---

## Self-Review

**Spec coverage:** Every spec section maps to a phase — stack/§3→P1-2, design/§4→P4, architecture/§5→file structure, data/§6→P3.2, security/§7→P3.3-3.4 & P6, auth/§8→P6-7, domain/§9→P5, routes/§10→P7-9, components/§11→P4.2/7/8/9, env/§13→P1.3, manual/§15→P10.2 & P11, acceptance/§16→P10.3. ✔
**Placeholders:** none — `/api/webhooks` is intentionally a placeholder route (documented), not a plan gap. ✔
**Type consistency:** `Database`/`types/app.ts` (P2.2) are the single source; domain types (P5) and queries reference them; function names match across phases. ✔
