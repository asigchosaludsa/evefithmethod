# Branding refresh + editable message templates + Admin menu

> Design approved in brainstorming 2026-06-22. Single-coach platform. Build order:
> (A) branding/logo, then (B) template system + Admin editor + priority templates,
> then WhatsApp welcome and PDF as sub-phases of B.

## Phase A — Branding / logo

The brand mark is the wordmark **EVEFIT / METHOD** where the "V" is a double-stroke
checkmark (Adidas-stripe feel); EVEFIT white, "/ METHOD" scarlet (#FF3B47), on dark.

- Recreate as **SVG** (not the JPEG): two components in `components/common/`:
  - `BrandIcon` — the standalone double-stroke check (scalable, `currentColor`-aware where possible, scarlet accent stroke). Used as favicon, app icon, small logo, email avatar.
  - `Logo` — full wordmark using the check as the "V" + "/ METHOD". Replaces the current text-only `Logo`. Keep the same export name/signature so all call sites keep working.
- Icons/metadata: generate PNGs from the SVG icon (192, 512, apple-touch 180) into `public/`, add an SVG favicon, wire `app/layout.tsx` `metadata.icons` + a web manifest. Rasterize SVG->PNG with `sharp` (or `@resvg/resvg-js`) in a one-off script.
- Email: export a small PNG of the icon to `public/brand-icon.png`; email templates reference it by absolute URL in the header (emails do not support SVG reliably).
- Source kept at `media/imagenes/logo.jpeg` (gitignored media dir); committed assets are the SVG + generated PNGs.

## Phase B — Editable message templates + Admin menu

### Data: `message_templates` table (migration 0010)
Columns: `key` text PK (e.g. `invitation`, `welcome`, `password_recovery`, `plan_ready`,
`unlink`, `weekly_summary`, `lead_notification`, `wa_welcome`), `channel` text
(`email`|`whatsapp`), `enabled` boolean default true, `subject` text (email only),
`heading` text, `body` text (the editable paragraph(s); supports `{{variables}}` and
blank-line-separated paragraphs), `cta_label` text, `cta_target` text (a route key like
`/student/today` or a runtime link), `updated_at` timestamptz.
RLS: only `is_coach()` may select/update. No insert/delete from the app (rows are seeded).

### Rendering engine (`lib/email/render.ts`)
- Built-in DEFAULT content for every key lives in code (so the system works with an
  empty table). `getTemplate(key)` reads the DB row if present, else the default.
- `renderEmail(key, vars)` -> `{ subject, html }`: substitutes `{{var}}` tokens in
  subject/heading/body/cta_label, then wraps heading+body+cta in the LOCKED branded
  shell (the existing `lib/email/templates.ts` shell, refactored to take blocks).
  Unknown/missing vars render as empty string (never leak `{{...}}`).
- `renderWhatsapp(key, vars)` -> `{ text }`: plain text with vars substituted.
- Variables are per-key and documented (e.g. invitation: `nombre`, `link`; weekly:
  `nombre`, `racha`, `adherencia`, `entrenos`; unlink: `nombre`, `semanas`, `entrenos`,
  `pesoInicial`, `pesoActual`).

### Admin menu: `/coach/plantillas`
- New coach nav item "Plantillas" (lucide `Mail` or `FileText`).
- Lists templates grouped by channel. Each opens an editor form: enabled toggle,
  subject (email), heading, body (textarea), cta label. A side panel shows the
  available `{{variables}}` for that key and a note that design is fixed.
- "Enviar prueba a mi correo" button renders with sample vars and emails the coach.
- Save -> upsert the DB row (coach-only, server action). The branded shell/design is
  NOT editable here (locked), per the chosen approach.

### Priority templates (content + triggers)
1. **plan_ready** (email + PDF): manual button "Enviar plan por correo" on the coach's
   student view. Renders a macros + workout-days summary and attaches a branded PDF.
2. **unlink / "Vuelve pronto"** (email): sent from `unlinkStudent` with a recap
   (weeks active, workouts completed, weight start->latest, best streak) computed from
   the student's data before/at unlink.
3. **weekly_summary** (email): "tu semana en números" (adherence, streak, progress).
   Trigger: a Vercel Cron route (`/api/cron/weekly`) that iterates active students.
   (Cron is a later sub-phase; the template + a manual "enviar resumen" come first.)
4. **lead_notification** (email to the owner/coach): sent from `submitLeadRequest` when
   a new lead arrives, so the coach is notified.

### WhatsApp welcome
- Editable `wa_welcome` template (text + `{{nombre}}`, `{{link}}`).
- On the coach's student view, a "Enviar bienvenida por WhatsApp" button builds a
  `wa.me/<phone>?text=<rendered>` deep link (opens WhatsApp web/desktop, coach hits send).
  Welcome only (no other automated WhatsApp), to avoid saturating students.

### PDF (`lib/pdf/plan.ts`)
- Use `@react-pdf/renderer` (no headless browser; works on Vercel). Branded A4 PDF:
  header with logo, student name, nutrition targets (macros), workout days + exercises,
  coach notes. Returned as a Buffer and attached to the `plan_ready` email via Resend.

## Out of scope (later)
Advanced HTML template editor, multi-coach, gamification badges, re-engagement/cron
beyond weekly, image uploads in templates.

## Build order within this spec
A) Branding (logo SVG + icon + favicon + apply in app & emails).
B1) `message_templates` table + render engine + migrate existing templates (invitation,
    welcome, recovery, confirmation) into it.
B2) Admin `/coach/plantillas` editor + nav + send-test.
B3) New templates: lead_notification, unlink, plan_ready (+PDF), weekly_summary (manual).
B4) WhatsApp welcome button.
B5) Weekly cron (optional, last).
