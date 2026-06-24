import * as React from 'react';
import { muscleGroupColor } from '@/lib/constants/exercises';
import { cn } from '@/lib/utils/cn';

/**
 * MuscleGroupIcon — glifo SVG de línea por grupo muscular, on-brand.
 *
 * Mapea cada grupo canónico (lib/constants/exercises) a un ícono distinto y lo
 * tinta con su color de acento (mismo `muscleGroupColor` que ya usa la app). Para
 * grupos desconocidos cae a una mancuerna genérica con el color de respaldo.
 *
 * Pensado como reemplazo del "círculo con la primera letra" en las tarjetas de
 * ejercicio. Decorativo por defecto (`aria-hidden`); pasa `title` para hacerlo
 * accesible. Sin animación → seguro con reduced-motion.
 */

type GlyphKey =
  | 'gluteos'
  | 'cuadriceps'
  | 'femoral'
  | 'espalda'
  | 'pecho'
  | 'hombros'
  | 'biceps'
  | 'triceps'
  | 'core'
  | 'gemelos'
  | 'cuerpo'
  | 'cardio'
  | 'dumbbell';

/** Normaliza el nombre del grupo (sin acentos / minúsculas) a una clave de glifo. */
function glyphKeyFor(muscleGroup: string | null | undefined): GlyphKey {
  if (!muscleGroup) return 'dumbbell';
  // NFD-normalize y quita marcas diacríticas combinantes (U+0300–U+036F) para
  // que "Glúteos" y "Gluteos" coincidan. Rango contiguo de code points simples.
  const norm = muscleGroup
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();

  if (norm.includes('gluteo')) return 'gluteos';
  if (norm.includes('cuadriceps') || norm.includes('cuadricep')) return 'cuadriceps';
  if (norm.includes('femoral') || norm.includes('isquio')) return 'femoral';
  if (norm.includes('espalda') || norm.includes('dorsal')) return 'espalda';
  if (norm.includes('pecho') || norm.includes('pectoral')) return 'pecho';
  if (norm.includes('hombro') || norm.includes('deltoid')) return 'hombros';
  if (norm.includes('bicep')) return 'biceps';
  if (norm.includes('tricep')) return 'triceps';
  if (norm.includes('core') || norm.includes('abdomen') || norm.includes('abdominal')) return 'core';
  if (norm.includes('gemelo') || norm.includes('pantorrilla') || norm.includes('soleo')) return 'gemelos';
  if (norm.includes('cuerpo') || norm.includes('completo') || norm.includes('full')) return 'cuerpo';
  if (norm.includes('cardio') || norm.includes('hiit')) return 'cardio';
  return 'dumbbell';
}

const S = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.8,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const;

/** Glifos en viewBox 24×24, trazo en currentColor (se tinta vía `color`). */
const GLYPHS: Record<GlyphKey, React.ReactNode> = {
  // Mancuerna (también fallback).
  dumbbell: (
    <>
      <line x1="7" y1="12" x2="17" y2="12" {...S} />
      <rect x="3.5" y="8.5" width="3.5" height="7" rx="1.2" {...S} />
      <rect x="17" y="8.5" width="3.5" height="7" rx="1.2" {...S} />
    </>
  ),
  // Glúteos: dos curvas.
  gluteos: (
    <>
      <path d="M12 5 C7 5 6 11 6 14 C6 17 8 19 10 19 C11.5 19 12 17.5 12 16" {...S} />
      <path d="M12 5 C17 5 18 11 18 14 C18 17 16 19 14 19 C12.5 19 12 17.5 12 16" {...S} />
    </>
  ),
  // Cuádriceps: muslo flexionado.
  cuadriceps: (
    <>
      <path d="M8 4 L8 12 C8 16 11 18 15 18 L18 18" {...S} />
      <line x1="8" y1="8" x2="13" y2="8" {...S} />
      <line x1="8" y1="11" x2="12" y2="11" {...S} />
    </>
  ),
  // Femoral: curva posterior con líneas.
  femoral: (
    <>
      <path d="M16 4 L16 12 C16 16 13 18 9 18 L6 18" {...S} />
      <line x1="16" y1="8" x2="11" y2="8" {...S} />
      <line x1="16" y1="11" x2="12" y2="11" {...S} />
    </>
  ),
  // Espalda: forma en V (alas).
  espalda: (
    <>
      <line x1="12" y1="4" x2="12" y2="20" {...S} />
      <path d="M12 7 L5 11 L7 17" {...S} />
      <path d="M12 7 L19 11 L17 17" {...S} />
    </>
  ),
  // Pecho: dos arcos.
  pecho: (
    <>
      <path d="M11.5 7 C11.5 11 9 13 6.5 13 C5 13 5 10 6 8.5 C7 7 9.5 6.5 11.5 7 Z" {...S} />
      <path d="M12.5 7 C12.5 11 15 13 17.5 13 C19 13 19 10 18 8.5 C17 7 14.5 6.5 12.5 7 Z" {...S} />
    </>
  ),
  // Hombros: deltoides redondeados.
  hombros: (
    <>
      <path d="M5 16 C5 10 8 7 12 7 C16 7 19 10 19 16" {...S} />
      <line x1="12" y1="7" x2="12" y2="12" {...S} />
    </>
  ),
  // Bíceps: brazo flexionado con bulto.
  biceps: (
    <>
      <path d="M7 19 L7 11 C7 8 9 6 12 6" {...S} />
      <path d="M7 12 C10 12 12 14 12 17" {...S} />
      <circle cx="9" cy="13.5" r="0.6" fill="currentColor" stroke="none" />
    </>
  ),
  // Tríceps: brazo extendido por detrás.
  triceps: (
    <>
      <path d="M17 5 L17 13 C17 16 15 18 12 18" {...S} />
      <path d="M17 12 C14 12 12 14 12 17" {...S} />
    </>
  ),
  // Core: torso con líneas de abdominales.
  core: (
    <>
      <rect x="8" y="5" width="8" height="14" rx="3" {...S} />
      <line x1="12" y1="5" x2="12" y2="19" {...S} />
      <line x1="9" y1="10" x2="15" y2="10" {...S} />
      <line x1="9" y1="14" x2="15" y2="14" {...S} />
    </>
  ),
  // Gemelos: pantorrilla.
  gemelos: (
    <>
      <path d="M10 4 C10 9 13 10 13 14 C13 17 11 19 9 19" {...S} />
      <path d="M10 4 C10 8 8 9 8 12" {...S} />
    </>
  ),
  // Cuerpo completo: figura.
  cuerpo: (
    <>
      <circle cx="12" cy="6" r="2.2" {...S} />
      <line x1="12" y1="8.2" x2="12" y2="15" {...S} />
      <path d="M6 10 L12 12 L18 10" {...S} />
      <path d="M12 15 L8 20" {...S} />
      <path d="M12 15 L16 20" {...S} />
    </>
  ),
  // Cardio: corazón con pulso.
  cardio: (
    <>
      <path d="M12 19 C12 19 5 14.5 5 9.8 C5 7.4 6.9 6 8.6 6 C10 6 11.4 7 12 8.2 C12.6 7 14 6 15.4 6 C17.1 6 19 7.4 19 9.8 C19 14.5 12 19 12 19 Z" {...S} />
      <path d="M8 12 L10.5 12 L11.5 10 L13 14 L14 12 L16 12" {...S} strokeWidth={1.4} />
    </>
  ),
};

export interface MuscleGroupIconProps {
  muscleGroup: string | null | undefined;
  /** Clase para tamaño/posición (controla el `size-*` del SVG). */
  className?: string;
  /** Tinte explícito; por defecto el color de acento del grupo. */
  color?: string;
  /** Texto accesible; si se omite, el ícono es decorativo (`aria-hidden`). */
  title?: string;
}

export function MuscleGroupIcon({ muscleGroup, className, color, title }: MuscleGroupIconProps) {
  const key = glyphKeyFor(muscleGroup);
  const tint = color ?? muscleGroupColor(muscleGroup);
  const decorative = !title;
  return (
    <svg
      viewBox="0 0 24 24"
      role={decorative ? undefined : 'img'}
      aria-hidden={decorative || undefined}
      aria-label={title}
      focusable="false"
      className={cn('size-5 shrink-0', className)}
      style={{ color: tint }}
      xmlns="http://www.w3.org/2000/svg"
    >
      {title ? <title>{title}</title> : null}
      {GLYPHS[key]}
    </svg>
  );
}

/**
 * Variante "badge": el ícono dentro de un círculo tintado tenue (bg + el glifo
 * en el color de acento). Reemplaza directamente al "círculo con la inicial".
 */
export function MuscleGroupBadge({
  muscleGroup,
  className,
  iconClassName,
  title,
}: {
  muscleGroup: string | null | undefined;
  className?: string;
  iconClassName?: string;
  title?: string;
}) {
  const tint = muscleGroupColor(muscleGroup);
  return (
    <span
      className={cn('flex items-center justify-center rounded-full', className)}
      style={{ backgroundColor: `color-mix(in oklab, ${tint} 16%, transparent)` }}
    >
      <MuscleGroupIcon muscleGroup={muscleGroup} className={iconClassName} color={tint} title={title} />
    </span>
  );
}
