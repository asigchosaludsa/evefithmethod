# PRODUCT.md — EveFit Method

**What it is:** A web platform for 1:1 fitness + nutrition coaching. One coach manages her female students ("alumnas"); each alumna gets a private portal. Core idea: the alumna knows what to do today; the coach knows who to review today. Training is the primary focus; nutrition supports it.

**Register:** mixed. The marketing **landing (`app/page.tsx`) is BRAND** (design is the product — bold, distinctive, motion-forward). The **app (coach + student portals) is PRODUCT** (design serves the task — clear, fast, restrained).

**Audience:** a fitness coach and her clients (Spanish-speaking, Ecuador/LatAm). Mobile-first but desktop-capable. Energetic, disciplined, aspirational — not clinical, not cutesy.

**Brand voice (three words):** strong · feminine · disciplined. Confident, direct, motivating. Spanish UI.

**Identity (already committed — preserve, do not reflex-reject):**
- Theme: **dark "Acero & Escarlata" (B3)** — deep steel-charcoal canvas, scarlet `#FF3B47` accent, silver-gray, white.
- Type: **Archivo** (display/headings, condensed-strong) + **Inter** (body/UI). Tabular numerals for stats.
- Tokens live in `app/globals.css` (`@theme`). Components in `components/common`.

**Key surfaces:** landing (brand), auth, coach portal (radar, students, plans, workout builder, exercises, content, alerts), student portal (today, meals, workout, progress, content, profile).

**Stack:** Next.js 16 App Router, React 19, TS strict, Tailwind v4, Supabase, Zod.

**Constraints:** no payments/AI/native yet. Respect `prefers-reduced-motion`. No fabricated social proof (brand-new product — do not invent user counts/metrics).
