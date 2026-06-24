# Landing v2 — cinematográfica (Design)

> Fase 2 de la mejora de landing (Fase 1 = bug del rotador + WhatsApp, ya desplegada).
> Aprobada por la dueña el 2026-06-23. Decisión: secuencia scroll-scrubbed **generada por
> código** (escena paramétrica on-brand, nada de stock genérico); imágenes creadas a medida.

## Objetivo

Elevar la landing a algo vanguardista y único: una sección cinematográfica donde, al hacer scroll,
"se arma el día" de la alumna (efecto tipo Apple AirPods adaptado al producto), más "Hola Camila"
con vida, toques premium medidos e imágenes creativas generadas, sin sobrecargar ni introducir
saltos de layout.

## Componentes / piezas

### 1. Sección cinematográfica "Tu día se arma mientras bajas" (la pieza central)
- **Mecánica:** una sección alta (~300vh) con un contenedor interno `sticky` (100vh) que queda
  *pinned* mientras se scrollea; el progreso de scroll dentro de la sección (0→1) maneja la
  animación. Implementación robusta cross-browser: componente cliente que escucha scroll
  (rAF-throttled) + `IntersectionObserver` para activar; calcula `progress` y lo aplica como CSS var
  `--p` en el contenedor; el SVG/escena lee `--p` vía `calc()` o estilos inline derivados.
- **Escena (paramétrica, generada por código — "frames" continuos, no PNGs):** un teléfono on-brand
  (Acero & Escarlata) cuyo contenido "se construye" por tramos de progreso:
  - 0.00–0.20: el teléfono entra (escala 0.9→1, fade, leve rotación) desde un glow escarlata.
  - 0.20–0.45: el anillo de "Entrenamiento" se llena 0→75%.
  - 0.45–0.65: la línea de peso se dibuja (stroke-dashoffset).
  - 0.65–0.85: aparecen los ✓ del calendario (pop escalonado) y se llenan las barras de macros.
  - 0.85–1.00: estado final "Tu día, claro" + micro-CTA "Así se ve por dentro".
- A los lados, textos cortos que entran sincronizados con cada tramo (scrollytelling): 3-4 mensajes
  ("Sabes qué entrenar hoy", "Ves tu progreso real", "Tu coach te acompaña").
- **Reduced-motion / sin JS:** si `prefers-reduced-motion: reduce` o no hay JS, se muestra el estado
  final ya armado (estático), sin scrubbing. Contenido visible por defecto.
- **Perf:** solo `transform`/`opacity`/`stroke-dashoffset`/CSS vars; scroll handler con rAF y
  `will-change` acotado; nada de reflow por scroll.
- Archivos: `components/landing/CinematicReveal.tsx` (cliente, mecánica de scroll + escena SVG) y, si
  crece, sub-piezas de la escena en el mismo archivo.

### 2. "Hola, Camila" con vida (en `PreviewPeek` `FeaturedToday`)
- Avatar (iniciales/ilustración), punto "en vivo" pulsando (ya existe, mejorarlo), una línea de
  contexto ("Día 12 · racha 🔥 3"), y micro-entrada escalonada de las filas. Que se sienta una app
  real en uso, no un mockup plano.

### 3. Toques premium (medidos, reduced-motion safe)
- **Glow del hero que sigue al cursor** (pointer-reactive radial, sutil; desktop/hover only).
- **Botones magnéticos** (leve atracción al cursor) en los CTA principales (hover+fine pointer only).
- **Barra de progreso de scroll** delgada arriba (distinta de la de navegación de la app; solo en la
  landing pública).
- **Count-up** en números clave (si hay una sección de stats/credibilidad; si no, omitir — YAGNI).
- Reutilizar utilidades existentes (`btn-sheen`, `efm-fade-up`, `Reveal`) donde aplique.

### 4. Imágenes creativas generadas (SVG)
- Escenas/ilustraciones SVG on-brand donde eleven (encabezado de la sección cinematográfica, una
  banda de "transformación/constancia"), creadas a medida (no stock). Reutilizar el sistema de
  `SectionIllustration` si encaja; añadir variantes nuevas si hace falta.

### 5. Revisión exhaustiva de glitches / CLS
- Auditar la landing por saltos de layout y animaciones que reflowean: el rotador (ya arreglado),
  clamps de tipografía, imágenes/mockups sin dimensiones reservadas, `Reveal` que oculte contenido,
  la nueva sección pinned (que no rompa el scroll en móvil). Verificación con capturas en preview.

## Arquitectura / aislamiento
- Cada pieza es un componente cliente acotado e independiente: `CinematicReveal`,
  (mejoras a) `PreviewPeek`, `CursorGlow`, `MagneticButton`, `ScrollProgressBar`. Se montan en
  `app/page.tsx` / `Hero`. Nada toca la lógica de la app (solo marketing).
- El scroll handler de `CinematicReveal` y el de `ScrollProgressBar` deben ser independientes y
  rAF-throttled; desconectar listeners al desmontar.

## Manejo de casos borde
- **Móvil:** la sección pinned debe degradar bien (en pantallas pequeñas, reducir la altura de scroll
  o mostrar la escena final sin pin si el alto no alcanza). Probar a 380px y desktop.
- **Reduced-motion:** estado final estático en todas las piezas; sin scrubbing, sin magnético, sin
  glow móvil.
- **Sin JS:** contenido visible (la escena final renderiza por defecto; las animaciones solo mejoran).
- **Rendimiento:** un solo listener de scroll por pieza, rAF; evitar layout thrashing.

## Verificación
- Visual en preview (capturas) a desktop y ~380px: la secuencia se reproduce con el scroll, el estado
  final queda armado, "Hola Camila" se ve vivo, no hay saltos de layout, la barra de progreso y el
  glow funcionan, móvil no se rompe.
- `npm run lint`, `npm run typecheck`, `npm run test`, `npm run build`. Deploy a Vercel.

## Fuera de alcance
- Fotos foto-realistas (se generan escenas SVG paramétricas; fotos reales se integrarían después si la
  dueña las provee).
- Secuencia de PNGs discretos (se usa escena paramétrica continua: mejor calidad y peso).
