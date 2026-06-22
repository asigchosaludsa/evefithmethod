# EveFit Method — Fase 2: Cerrar faltantes + Landing animada

- **Date:** 2026-06-21
- **Status:** Approved
- **Builds on:** `2026-06-21-evefit-method-design.md` (foundation already built & deployed locally)
- **Priority signal from user:** focus EXTRA on **training**; nutrition is useful but secondary. Landing = bold motion (everfit/fittr style) + maximum impact, in the B3 dark theme.

## Hard rules
- **No DB schema changes** — every table already exists. Only new data: a larger `food_items` seed.
- **Verify every feature in the running app** (browser preview) before marking done. Build/typecheck passing is NOT enough (that's how the earlier gaps slipped).
- Apply `emil-design-eng` (motion), `impeccable` (ambitious visual effects), `design-taste-frontend` (anti-generic polish) to UI work.
- Respect `prefers-reduced-motion` for all animations.

## Scope

### A. Training (primary focus)
- **A1 — Guided workout logging:** the student's log is driven by the assigned plan. Show the assigned day's exercises with target sets/reps/suggested weight; the student records actual reps/weight per set, marks completed, adds RPE + notes. Replaces the generic free-form log (keep a fallback "extra" path).
- **A2 — Exercise progress history:** for coach (in student detail) and student — per-exercise weight/volume over time + estimated 1RM (use `domain/workouts`: `calculateWorkoutVolume`, `estimateOneRepMax`).
- **A3 — Technique video:** show `exercise.video_url` (link/embed) where exercises appear for the student; "video pendiente" when null.

### B. Critical gaps
- **B1 — Assign tips:** coach assigns a `content_post` to one or more students (`content_assignments`); student sees assigned tips (already reads them).
- **B2 — Review meals (coach):** in student detail, show today's/per-day food logs with totals vs plan target, and "Revisado / Requiere ajuste" buttons (wire `reviewFoodLog`).
- **B3 — Photo uploads:** optional photo when logging a meal (`food-photos`), progress photos (student uploads, coach views via signed URL — `progress-photos`), avatar (`avatars`). Validate type (jpg/png/webp) and size (~5MB).

### C. Important gaps
- **C1 — Custom foods + bigger catalog:** student/coach can create a `food_item` on the fly (name + per-100g macros) while logging; seed ~60 common foods.
- **C2 — "Mi nutrición" page (student):** `/student/nutrition` showing active plan targets + coach notes.
- **C3 — Alerts:** coach creates a manual alert and resolves alerts (`createCoachAlert` / `resolveAlert`); show on dashboard + student detail.
- **C4 — Invitations management:** coach sees pending invitations and can cancel (`cancelInvitation`).

### D. Landing — bold motion + maximum impact (B3 dark)
- Animated hero: rotating word in the headline, living animated background (grid/gradient with scarlet glow), staggered entrance.
- Scroll reveals (fade-up) per section; marquee strip of values/stats; animated counters; app mockup ("Hoy" screen) with subtle parallax/3D; card micro-interactions.
- All motion GPU-friendly (transform/opacity), under control, reduced-motion safe.

### E. Polish pass
- `design-taste-frontend` + `impeccable` review across both portals: consistency, hierarchy, spacing, states, details.

## Execution
- Use **dispatching-parallel-agents**: independent features (B1, B3, C1, C3, C4, A2) built by parallel agents, each touching distinct files; integration + verification by the main thread.
- Landing (D) and guided logging (A1) built carefully on the main thread (cross-cutting / motion).
- Commit per feature. Browser-verify each before closing.

## Acceptance
Each item is "done" only when demonstrated working in the running app (screenshot/observed), lint+typecheck+build green, committed. No unused server actions left (every action wired to UI).

## Out of scope (this batch)
Coach-defined recommended/limited foods (user de-prioritized), real email sending (SMTP), payments, push/PWA, native app.
