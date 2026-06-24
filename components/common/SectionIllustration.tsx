import * as React from 'react';
import { cn } from '@/lib/utils/cn';

/**
 * SectionIllustration — ilustraciones SVG on-brand (línea fina, escarlata + acero)
 * para headers, empty-states y momentos "hero". Estilo Linear/Stripe: trazo simple,
 * 1-2 colores de acento, nada de gradientes arcoíris.
 *
 * - El trazo base usa `currentColor` (heredado: por defecto `text-faint`), de modo
 *   que se adapta al tema oscuro. Los acentos usan `var(--color-primary)` (escarlata)
 *   y, donde aporta, un acento suave (`var(--color-info)`).
 * - Decorativas: `aria-hidden`. No cargan assets externos. Escalan con `width=100%`
 *   y `max-w` aplicado por la prop `className`.
 * - Sin animación (estáticas) → seguras con reduced-motion por construcción.
 */
export type IllustrationVariant =
  | 'today'
  | 'training'
  | 'nutrition'
  | 'progress'
  | 'photos'
  | 'tips'
  | 'coach'
  | 'students'
  | 'empty';

const COMMON_STROKE = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

const ACCENT = 'var(--color-primary)';

/** Cada ilustración dibuja en un viewBox 120×96. */
const SHAPES: Record<IllustrationVariant, React.ReactNode> = {
  // Sol naciente sobre horizonte + check: "lo que toca hoy".
  today: (
    <>
      <line x1="14" y1="70" x2="106" y2="70" {...COMMON_STROKE} opacity={0.55} />
      <circle cx="60" cy="70" r="20" {...COMMON_STROKE} stroke={ACCENT} />
      <g stroke={ACCENT} strokeWidth={2} strokeLinecap="round">
        <line x1="60" y1="30" x2="60" y2="22" />
        <line x1="38" y1="40" x2="33" y2="35" />
        <line x1="82" y1="40" x2="87" y2="35" />
        <line x1="26" y1="60" x2="19" y2="58" />
        <line x1="94" y1="60" x2="101" y2="58" />
      </g>
      <path d="M50 70 L57 77 L72 60" {...COMMON_STROKE} stroke={ACCENT} />
    </>
  ),

  // Mancuerna estilizada.
  training: (
    <>
      <line x1="30" y1="48" x2="90" y2="48" {...COMMON_STROKE} />
      <rect x="16" y="34" width="14" height="28" rx="4" {...COMMON_STROKE} stroke={ACCENT} />
      <rect x="90" y="34" width="14" height="28" rx="4" {...COMMON_STROKE} stroke={ACCENT} />
      <rect x="8" y="40" width="8" height="16" rx="3" {...COMMON_STROKE} opacity={0.7} />
      <rect x="104" y="40" width="8" height="16" rx="3" {...COMMON_STROKE} opacity={0.7} />
    </>
  ),

  // Plato con cubiertos: nutrición.
  nutrition: (
    <>
      <circle cx="58" cy="48" r="26" {...COMMON_STROKE} />
      <circle cx="58" cy="48" r="15" {...COMMON_STROKE} stroke={ACCENT} opacity={0.9} />
      <g {...COMMON_STROKE} opacity={0.7}>
        <line x1="96" y1="26" x2="96" y2="70" />
        <line x1="91" y1="26" x2="91" y2="40" />
        <line x1="101" y1="26" x2="101" y2="40" />
      </g>
      <path d="M18 26 C18 38 22 40 22 40 L22 70" {...COMMON_STROKE} opacity={0.7} />
    </>
  ),

  // Línea de tendencia ascendente con punto escarlata.
  progress: (
    <>
      <line x1="18" y1="78" x2="106" y2="78" {...COMMON_STROKE} opacity={0.5} />
      <line x1="18" y1="78" x2="18" y2="20" {...COMMON_STROKE} opacity={0.5} />
      <polyline points="24,66 46,54 64,60 84,34 102,26" {...COMMON_STROKE} stroke={ACCENT} />
      <circle cx="102" cy="26" r="4.5" fill={ACCENT} stroke="none" />
      <circle cx="46" cy="54" r="3" {...COMMON_STROKE} opacity={0.8} />
      <circle cx="84" cy="34" r="3" {...COMMON_STROKE} opacity={0.8} />
    </>
  ),

  // Marco de foto con montaña/sol: fotos de progreso.
  photos: (
    <>
      <rect x="22" y="22" width="76" height="56" rx="6" {...COMMON_STROKE} />
      <circle cx="42" cy="40" r="6" {...COMMON_STROKE} stroke={ACCENT} />
      <path d="M28 70 L50 50 L64 62 L78 48 L92 70" {...COMMON_STROKE} opacity={0.8} />
    </>
  ),

  // Bombilla: tips / contenido.
  tips: (
    <>
      <path
        d="M60 22 C46 22 38 32 38 44 C38 54 46 58 48 64 L72 64 C74 58 82 54 82 44 C82 32 74 22 60 22 Z"
        {...COMMON_STROKE}
        stroke={ACCENT}
      />
      <line x1="50" y1="70" x2="70" y2="70" {...COMMON_STROKE} />
      <line x1="54" y1="76" x2="66" y2="76" {...COMMON_STROKE} />
      <g stroke={ACCENT} strokeWidth={2} strokeLinecap="round" opacity={0.8}>
        <line x1="60" y1="10" x2="60" y2="4" />
        <line x1="90" y1="20" x2="95" y2="15" />
        <line x1="30" y1="20" x2="25" y2="15" />
      </g>
    </>
  ),

  // Silbato de coach.
  coach: (
    <>
      <path
        d="M30 44 L78 44 A18 18 0 1 1 60 62 L44 62 A4 4 0 0 1 40 58 L40 50"
        {...COMMON_STROKE}
        stroke={ACCENT}
      />
      <circle cx="60" cy="62" r="6" {...COMMON_STROKE} />
      <line x1="78" y1="34" x2="86" y2="28" {...COMMON_STROKE} opacity={0.7} />
      <line x1="30" y1="44" x2="22" y2="44" {...COMMON_STROKE} opacity={0.7} />
    </>
  ),

  // Dos siluetas (coach + alumna).
  students: (
    <>
      <circle cx="44" cy="38" r="11" {...COMMON_STROKE} stroke={ACCENT} />
      <path d="M26 74 C26 60 36 54 44 54 C52 54 62 60 62 74" {...COMMON_STROKE} stroke={ACCENT} />
      <circle cx="80" cy="42" r="9" {...COMMON_STROKE} opacity={0.7} />
      <path d="M66 74 C66 62 74 58 80 58 C86 58 94 62 94 74" {...COMMON_STROKE} opacity={0.7} />
    </>
  ),

  // Caja/bandeja vacía neutral: empty genérico.
  empty: (
    <>
      <path d="M24 44 L40 28 L80 28 L96 44" {...COMMON_STROKE} opacity={0.7} />
      <path d="M24 44 L24 72 L96 72 L96 44" {...COMMON_STROKE} />
      <path d="M24 44 L44 44 L50 52 L70 52 L76 44 L96 44" {...COMMON_STROKE} stroke={ACCENT} />
    </>
  ),
};

export interface SectionIllustrationProps {
  variant: IllustrationVariant;
  /** Controla el ancho/posición. Por defecto un tamaño compacto centrado. */
  className?: string;
  /** Texto accesible. Si se omite, la ilustración es decorativa (aria-hidden). */
  title?: string;
}

export function SectionIllustration({ variant, className, title }: SectionIllustrationProps) {
  const decorative = !title;
  return (
    <svg
      viewBox="0 0 120 96"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={title}
      focusable="false"
      className={cn('h-auto w-full text-faint', className)}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      {SHAPES[variant]}
    </svg>
  );
}
