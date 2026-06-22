# Landing refresh + Request-only signup flow (single coach)

> Design approved 2026-06-22. Single-coach model. No public self-signup.

## Part 1 — Landing changes

- Hero title: "Tu coaching fitness para entrenar con {palabra rotativa}" (keep words: método, fuerza, disciplina, constancia).
- Hero paragraph: "La coach arma tu plan. Tú sabes qué hacer hoy; ella sabe qué revisar. Acompañamiento real, método eficaz, resultados garantizados."
- Recreate `AppMockupHero` to match the provided image: dark card, "EVEFIT / METHOD" eyebrow + red dot, "Hola, Camila", "Tu método de hoy", three rows with rings: Entrenamiento 75% (scarlet), Alimentación 60% (amber), Recuperación 40% (green), each with a chevron.
- Features: remove the "Coach Radar" card; add "Recordatorios" -> "Notificaciones para recordarte que completes tu plan."
- CTA band heading: "Empieza tu planificación hoy".
- Sticky WhatsApp floating button, always visible, links to `https://wa.me/593960406569`.
- Second background-video section below the hero using `media/videos/ivi fit.MOV` (compressed to public/), same Ken Burns + video playback logic and size as the main hero.
- All landing CTAs "Crear cuenta" / "Empieza ahora" -> "Empieza ya" pointing to `/solicitud`.

## Part 2 — Request-only signup (lead -> approval -> invite)

Flow: Visitor -> "Empieza ya" -> `/solicitud` (request form) -> lead lands in coach panel -> coach reviews (payment handled privately) -> coach generates an invitation link -> sends via WhatsApp/email -> invitee registers as Alumna via the existing `/accept-invitation` flow.

### Data: `leads` table (migration 0009)
Columns: id uuid pk, full_name text not null, email text not null, phone text not null, goal text not null, experience_level text null, age int null, city text null, availability text null, injuries text null, message text null, status text not null default 'new' (new|contacted|converted|rejected), invitation_id uuid null, created_at timestamptz default now().
RLS: enabled. SELECT/UPDATE policies for `is_coach()` only. Inserts happen ONLY through the server action using the admin client (service role), after Zod validation + IP rate limiting; no public insert policy (no anon write surface).

### Public form `/solicitud`
Fields (Más completo): Nombre*, Email*, WhatsApp*, Objetivo* (select), Nivel, Edad, Ciudad, Disponibilidad, Lesiones/condiciones, Mensaje. Only the * are required. Rate-limited (`lead`, 5/hour/IP). Success screen confirming the request was received.

### Coach `/coach/solicitudes`
Lists leads (newest first), status badges, filters by status. Actions: mark contacted, mark rejected, and Convertir -> generates an invitation (reuses `createInvitation` with the lead email), flips lead to converted with invitation_id, and surfaces the raw link once with three buttons: Copiar, Enviar por WhatsApp (`wa.me/{phone}?text=...link`), Enviar por email (`mailto:{email}?subject=...&body=...link`). Nav item added to coach AppShell.

### Auth lockdown
- Remove public self-signup: `/register` redirects to `/solicitud` (self-serve email signup removed). Login keeps email/password + Google SSO for already-invited users.
- Non-invited authenticated user (e.g. fresh Google sign-in with role NULL and no active coach link): redirected to `/sin-acceso` ("Tu cuenta aún no está activa. Solicita tu cupo.") with a link to `/solicitud`. No app access.
- Single coach: no coach registration anywhere; leads and invitations route to the single coach.

### Delivery note
SMTP not configured yet, so email is via `mailto:` (coach's mail client) for now; automate via SMTP later. WhatsApp via `wa.me` deep link works today.

### Out of scope (for now)
Payments (handled privately/externally), automated email sending, multi-coach.
