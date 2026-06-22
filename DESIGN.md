# DESIGN.md — EveFit Method ("Acero & Escarlata")

Source of truth: `app/globals.css` (`@theme`). This file documents the system.

## Color (dark, committed)
- `--color-canvas` #0E1015 (page) · `--color-surface` #171B23 · `--color-elevated` #1B1F28
- `--color-border` #2A303C · `--color-hairline` #232936
- **`--color-primary` #FF3B47 (scarlet)** · `--color-primary-pressed` #E32A38 · `--color-on-primary` #FFFFFF
- text: `--color-foreground` #EEF1F6 · `--color-muted` #A7AEBA · `--color-faint` #6B7280
- semantic: success #2BD4A0 · warning #F5A524 · info #5B9BFF · danger = primary
- Strategy: **Committed dark**; scarlet carries brand energy. Glow used sparingly on focal elements.

## Type
- Display/headings + labels: **Archivo** (`--font-display`), tight tracking, uppercase for short labels.
- Body/UI: **Inter** (`--font-sans`). `.tabular` = tabular-nums for stats.
- Fluid `clamp()` headings; hero display max ~clamp to ≤6rem.

## Shape & depth
- Radius: md 10 / lg 14 / xl 20. Restrained borders + subtle inner highlights. Glow (scarlet) only on macro ring + primary CTA + hero.

## Motion (emil + impeccable)
- Easing: `--ease-out` cubic-bezier(0.23,1,0.32,1); add `--ease-out-expo` cubic-bezier(0.16,1,0.3,1) for confident entrances.
- Durations: feedback 100–160ms, UI state 150–250ms, entrances 500–800ms. Exits ~75% of enter.
- Press feedback: `active:scale-[0.97]`. Animate transform/opacity (+ bounded blur/glow). No bounce/elastic.
- Reveals enhance an already-visible default (use `animation-timeline: view()` or IntersectionObserver that defaults visible). Vary reveals — no uniform fade-up on every section.
- **Always** ship `@media (prefers-reduced-motion: reduce)` fallback.

## Components (`components/common`)
Button, SubmitButton, FormField/Input/Textarea/Select, Card(+Header/Title/Body/Footer), Badge, StatCard, ProgressRing, States (Loading/Empty/Error/Spinner), PageHeader/SectionHeader, Logo, ConfirmDialog. App shell: `components/navigation/AppShell` (variant coach|student).

## Landing (brand register)
Bold, motion-forward, B3 identity. Hero with living animated background + rotating word + animated app mockup. Marquee of values. Reveals on scroll (varied). No fabricated metrics. No generic identical-card grid; no "01/02/03" eyebrows unless a genuine sequence.
