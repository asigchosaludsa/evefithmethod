# EveFit Method — Design Spec

- **Date:** 2026-06-21
- **Status:** Approved (design), pending implementation plan
- **Author:** Brainstorming session (Claude Code)
- **Local path:** `C:\EveFitMethod` → migrates to GitHub + Vercel later
- **Domains (planned):** `evefitmethod.com` (marketing) · `app.evefitmethod.com` (private app)

---

## 1. Product Overview

EveFit Method is a **responsive web platform** (not a native mobile app, but architected so a future mobile app is possible) for **fitness + nutrition coaching**: one coach/instructor manages and accompanies her female students ("alumnas").

**Core idea:** _The student must know what to do today. The coach must know who to review today._

The coach manages: meal logging, calories/macros, nutrition plans, workout plans, exercise library, body weight & measurements, progress photos, food photos, tips/content, alerts (who needs review), a coach dashboard ("Coach Radar"), invitations, and internal notes. Each student gets a private portal: Today, my nutrition, log a meal, my workout, log a workout, my progress, my tips, my profile.

## 2. Key Decisions (resolved during brainstorming)

| # | Decision | Resolution |
|---|---|---|
| 2.1 | Build/deploy strategy | **Build the entire platform first, deploy at the end.** All code (foundation + both portals + logic + docs), then guided GitHub → Supabase → Vercel → domain. |
| 2.2 | Visual design | **Real, polished design is in scope** (user instruction overrides the prompt's "no visual design yet"). Direction = **B3 "Acero & Escarlata"** (dark, scarlet, silver-gray, white). Conveys strength · femininity · discipline. |
| 2.3 | Package manager | **npm** (pnpm equivalents documented). |
| 2.4 | Hosting topology | **Single Next.js app** serves both `evefitmethod.com` and `app.evefitmethod.com`; future separation documented. |
| 2.5 | Forbidden | No Firebase/Firestore/Firebase Auth/Hosting, no Expo, no React Native, no MongoDB, no separate backend, no service-role key in the client, no fake auth, no private data without RLS. |

## 3. Tech Stack

- **Next.js 15 (App Router)** + **React 19** + **TypeScript (strict)**. Server Components by default; **Server Actions** / Route Handlers for sensitive mutations.
- **Tailwind CSS v4** + custom components + **Radix UI primitives** only where accessibility is hard (Dialog, DropdownMenu, Tabs, Popover).
- **React Hook Form + Zod** (`zodResolver`); the same Zod schema validates on client and server.
- **Fonts:** Archivo (condensed display/labels) + Inter (body/UI) via `next/font` (self-hosted, no external CDN).
- **Supabase** via `@supabase/ssr`: Auth, Postgres, Storage. New-style keys (publishable/secret) with legacy anon/service_role compatibility.
- **Vitest** for unit tests of the pure domain layer (macros, workout volume, adherence, alerts).
- ESLint + Prettier + `tsc --noEmit`.
- Scripts: `dev`, `build`, `start`, `lint`, `typecheck`, `test`.

## 4. Design System — B3 "Acero & Escarlata"

**Color tokens (dark theme):**
- Backgrounds: app `#0E1015`, surface `#171B23`, elevated `#1B1F28`, border `#2A303C`, hairline `#232936`
- Primary scarlet `#FF3B47` (pressed `#E32A38`); subtle red glow on focal elements only (macro ring, primary CTA)
- Text: primary `#EEF1F6`, muted/silver `#A7AEBA`, faint `#6B7280`
- Semantic (alerts): critical `#FF3B47`, warning `#F5A524`, success `#2BD4A0`, info `#5B9BFF`

**Typography:** Archivo for headings/labels (uppercase + tracking on labels, **tabular numbers** for stats); Inter for body and UI.
**Shape:** radius scale 8 / 10 / 14 / full; restrained shadows; glow used sparingly.
**Motion:** fast and precise (150–200ms, ease-out), per `emil-design-eng` principles. No gratuitous animation.
**Responsive:** mobile-first; tables collapse to cards on mobile; single-column forms; touch-friendly targets; no hover-only affordances; no mandatory modals in critical flows. Accessible: semantic HTML, real buttons, labels, error/loading/empty states, basic keyboard nav.

During build, invoke `emil-design-eng` and `design-taste-frontend` to realize this with craft (no generic UI).

## 5. Architecture & Folder Structure

```
app/
  (public)/        login, register, accept-invitation, forgot/reset/update-password, terms, privacy, disclaimer
  auth/            callback (route), auth-code-error, confirm, logout (route)
  onboarding/
  (protected)/
    coach/         dashboard, students[/[id]/nutrition|workouts|progress|notes], nutrition[/plans], workouts[/plans], exercises, content, settings
    student/       today, meals[/new], workout, progress, content, profile
  api/             health, webhooks (placeholder)
components/        common, forms, coach, student, navigation
lib/
  supabase/        client.ts, server.ts, middleware.ts, admin.ts
  auth/            require-auth.ts, roles.ts, redirects.ts
  db/              queries/, mutations/
  utils/
domain/            nutrition, workouts, progress, alerts  (calculations.ts + schemas.ts + types.ts, with Vitest tests)
types/             database.ts, app.ts
supabase/          migrations/, seed.sql, storage-policies.sql
docs/              AUTH_SETUP, EMAIL_SETUP, DATABASE_SCHEMA, SECURITY, STORAGE_SETUP, PRODUCT_FLOWS, GITHUB_SETUP, VERCEL_DEPLOYMENT, DOMAIN_SETUP, NEXT_STEPS
```

**Principle:** business logic (`domain/`) is pure TypeScript, testable without React. UI never decides permissions — server + RLS do.

## 6. Data Model

**25 tables** (full field definitions live in `supabase/migrations/`):
`profiles`, `coach_profiles`, `student_profiles`, `coach_students`, `invitations`, `nutrition_plans`, `nutrition_plan_food_recommendations`, `food_items`, `food_logs`, `food_log_items`, `workout_plans`, `workout_plan_days`, `exercises`, `workout_plan_exercises`, `workout_logs`, `workout_log_sets`, `weight_entries`, `body_measurements`, `progress_photos`, `content_posts`, `content_assignments`, `coach_notes`, `student_checkins`, `alerts`, `auth_events`.

Every private table has `id uuid pk`, `created_at`, `updated_at`, FKs with `on delete cascade` where appropriate, check constraints on enums, and indexes on hot foreign keys (`coach_id`, `student_id`, `logged_at`, etc.). Migrations are numbered & grouped: `0001_extensions` → `0002_helpers_roles` → `0003_core_tables` → `0004_rls_policies` → `0005_storage` → `0006_triggers` → `seed.sql`.

## 7. Security Model

- **RLS on every private table.** Helper SQL functions: `current_user_role()`, `is_admin(uuid)`, `is_coach(uuid)`, `is_student(uuid)`, `coach_has_student(coach uuid, student uuid)` — all `SECURITY DEFINER`, `search_path` pinned, to avoid recursive-RLS pitfalls.
- **Role escalation prevention:** a `BEFORE UPDATE` policy/trigger blocks clients from changing their own `role`. Students cannot change role; coaches cannot change sensitive roles from normal UI.
- **`handle_new_user` trigger** on `auth.users`: creates a baseline `profiles` row with `status='pending'`, `onboarding_completed=false`, and role resolved only from a trusted server path (invitation) — never trusts arbitrary client metadata.
- **First coach:** promoted manually via SQL/Supabase (documented). Documented seed for `coach@example.com`.
- **Invitations:** coach creates → store only `token_hash` (long random token shown once), `expires_at`, status `pending/accepted/expired/cancelled`. Acceptance handled in a **Server Action using the secret key**: validate token → create auth user → create profile (role=student) → student_profile → coach_students link → mark accepted. Don't leak whether an email exists.
- **Storage policies:** `food-photos` & `progress-photos` private (owner student + assigned coach); `exercise-videos` per exercise status; `avatars` controlled. Validate file type (jpg/jpeg/png/webp; mp4/mov future) and size.
- **Env safety:** only `NEXT_PUBLIC_*` reach the client; secret/service-role keys are server-only. No sensitive data in localStorage. Sanitize coach-authored content (XSS in `content_posts`). Validate safe redirect in `/auth/callback` (relative paths only; no open redirects). Rate-limit/CAPTCHA documented as future.

## 8. Auth & Roles

- Email+password with email confirmation, password reset/update.
- OAuth: **Google, Facebook, Apple** via `supabase.auth.signInWithOAuth`, each using `redirectTo = \`${getURL()}/auth/callback\``.
- `getURL()` resolves env per environment (localhost / app.evefitmethod.com).
- `/auth/callback` exchanges code → session, validates `next`, redirects by role; failure → `/auth/auth-code-error`.
- Real logout: `signOut()`, clears SSR cookies, redirects to `/login`, prevents back-button access to private routes.
- Guards: `requireAuth()`, `requireRole(role)`, `requireCoach()`, `requireStudent()`, `getCurrentProfile()`, `assertCoachOwnsStudent()`, `redirectUserByRole(profile)`, `validateSafeRedirect(next)`.
- Reusable: `signInWithGoogle/Facebook/Apple/Email`, `signUpWithEmail`, `signOut`, `resetPassword`, `updatePassword`.
- Login flow: verify session → read `profiles` → no profile/incomplete → `/onboarding`; `inactive` → block; `coach` → `/coach`; `student` → `/student/today`; `admin` → `/coach` (admin not fully built); invalid → error + sign out.

## 9. Domain Logic (pure TS + Vitest)

- **Nutrition:** `calculateFoodMacros`, `calculateMealTotals`, `calculateDailyNutritionTotals`, `calculateMacroProgress`, `generateMacroRescueSuggestion` (rule-based, no AI), `calculateNutritionAdherence`. Macro math: `qty = grams/100; calories = cal_per_100g * qty; …`.
- **Workouts:** `calculateWorkoutVolume`, `calculateWorkoutCompletion`, `getExerciseProgress`, `compareLastWorkoutPerformance`, `calculateWeeklyWorkoutAdherence`.
- **Progress:** `calculateWeightChange`, `calculateWeeklyWeightTrend`, `calculateMeasurementChange`, `buildWeeklyProgressSummary`.
- **Alerts (rule-based):** `detectNoFoodLogs`, `detectLowProteinAdherence`, `detectMissedWorkouts`, `detectWeightSpike`, `detectPositiveProgress`, `createCoachAlert`.
- **Zod schemas** for: login, register, reset password, invitation, onboarding, nutrition plan, food log, workout plan, workout log, weight, measurements, content/tip, coach note, exercise.

## 10. Routes (minimum to implement)

Public: `/`, `/login`, `/register`, `/accept-invitation`, `/forgot-password`, `/reset-password`, `/update-password`, `/terms`, `/privacy`, `/disclaimer`.
Auth: `/auth/callback`, `/auth/auth-code-error`, `/auth/confirm`, `/auth/logout`.
Onboarding: `/onboarding`.
Coach: `/coach`, `/coach/students`, `/coach/students/invite`, `/coach/students/[studentId]` (+ `/nutrition`, `/workouts`, `/progress`, `/notes`), `/coach/nutrition`(+`/plans/new`,`/plans/[planId]`), `/coach/workouts`(+`/plans/new`,`/plans/[planId]`), `/coach/exercises`(+`/new`,`/[exerciseId]`), `/coach/content`(+`/new`,`/[contentId]`), `/coach/settings`.
Student: `/student`, `/student/today`, `/student/meals`(+`/new`), `/student/workout`, `/student/progress`, `/student/content`, `/student/profile`.
API: `/api/health`, `/api/webhooks` (placeholder).

## 11. Components

Common: PageHeader, SectionHeader, StatCard, DataTable, EmptyState, LoadingState, ErrorState, ConfirmDialog, FormField, SubmitButton, RoleGuard, ResponsiveShell.
Auth: LoginForm, RegisterForm, OAuthButtons, ForgotPasswordForm, ResetPasswordForm, OnboardingForm, LogoutButton.
Coach: CoachDashboardStats, StudentPriorityList, StudentCard, StudentTable, StudentDetailSummary, NutritionPlanForm, WorkoutPlanForm, ExerciseForm, FoodLogReviewList, CoachNotesPanel, AlertList, ContentPostForm, InviteStudentForm.
Student: TodaySummary, MacroProgress, FoodLogForm, FoodLogItemsTable, MacroRescuePanel, WorkoutTodayPanel, WorkoutLogForm, ProgressEntryForm, ProgressHistory, AssignedContentList.
Navigation: PublicNav, CoachSidebar, StudentSidebar, MobileNav, UserMenu.

## 12. Build Sequence

1. Scaffold (Next.js + Tailwind + ESLint/Prettier + `.env.example` + `.gitignore`)
2. Supabase clients (browser/server/middleware/admin) + base types
3. Full SQL migrations (tables + RLS + storage + triggers + seed)
4. Design system (tokens, fonts, common components) — via `emil-design-eng`/`design-taste-frontend`
5. Domain layer + Zod schemas + Vitest tests
6. Auth (flows, callback, logout, guards, social, onboarding, invitations)
7. Public site
8. Coach portal
9. Student portal (incl. Macro Rescue)
10. API routes
11. Documentation (README, CLAUDE.md, docs/*.md)
12. Verify: lint + typecheck + build + tests
13. Guided deploy: GitHub → Supabase → Vercel → domain `evefitmethod.com`

Implementation will use **multi-agent workflows** (Ultracode) — parallel agents per module with verification.

## 13. Environment Variables

```
NEXT_PUBLIC_SITE_URL=https://app.evefitmethod.com
NEXT_PUBLIC_MARKETING_URL=https://evefitmethod.com
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=     # (or legacy anon key)
SUPABASE_SECRET_KEY=                       # server-only
SUPABASE_SERVICE_ROLE_KEY=                 # server-only, only where strictly needed
# Future (not implemented): RESEND_API_KEY, POSTMARK_API_KEY, SENTRY_DSN, NEXT_PUBLIC_SENTRY_DSN, STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
```

## 14. Deferred (NOT in this build)

Firebase (any), real payments/Stripe, realtime chat, real AI, photo food analysis, barcode, wearables/Apple Health/Health Connect, push notifications, full PWA, native app, multi-coach marketplace, video calls, advanced calendar. **Prepared conceptually:** photo storage, exercise `video_url`, content/tips, alerts, invitations, roles, domain, deploy, emails, social login.

## 15. Manual Setup (documented, user performs)

Create Supabase project + run migrations; configure Google/Meta/Apple OAuth providers; configure email confirmations + SMTP for production; buy domain; connect Vercel; set env vars in Vercel; set Supabase Site URL + Redirect URLs (localhost + app/marketing/www variants). Guided step-by-step at the end.

## 16. Acceptance Criteria

The 46 acceptance criteria from the source prompt apply (compiles, typecheck clean, full auth incl. social, callback, logout, route protection, role redirect, invitations, separated portals, SQL migrations + RLS, storage policies/docs, coach manages students/plans, student logs meals/workouts/progress, macro & progress calculations, coach radar with priorities/alerts, responsive, full docs, no exposed service key, no private data without session, no Firebase, GitHub/Vercel/domain docs, `.env.example`, `CLAUDE.md`, build + lint pass).

## 17. Open Risks / Notes

- Apple OAuth requires a paid Apple Developer account; code is ready, provider config is manual and may be deferred.
- Email deliverability needs custom SMTP + SPF/DKIM/DMARC before production (documented; not implemented).
- Tailwind v4 + Next 15 + React 19 is current but evolving; pin versions and verify the build.
- RLS helper functions must be `SECURITY DEFINER` with pinned `search_path` to avoid infinite recursion on `profiles` policies.
- Rate limiting / CAPTCHA on auth endpoints documented as a pre-production task.
