import { MACROS, macroValue } from '@/lib/nutrition/macro-display';
import { cn } from '@/lib/utils/cn';
import type { Macros } from '@/types/app';

/**
 * Línea de macros con color consistente: "P {n} · C {n} · G {n}".
 * Cada letra/valor toma el color del macro (Proteína=azul, Carbos=ámbar,
 * Grasa=verde). Usa los tokens del sistema de diseño, no hex.
 */
export function MacroLine({
  macros,
  unit = '',
  className,
}: {
  macros: Partial<Macros>;
  /** Sufijo opcional tras cada número, p.ej. "g". */
  unit?: string;
  className?: string;
}) {
  return (
    <span className={cn('tabular inline-flex flex-wrap items-center gap-x-1.5', className)}>
      {MACROS.map((m, i) => (
        <span key={m.key} className="inline-flex items-center">
          {i > 0 && <span className="mr-1.5 text-faint">·</span>}
          <span className={m.textClass}>
            {m.short} {macroValue(macros, m.key)}
            {unit}
          </span>
        </span>
      ))}
    </span>
  );
}

/**
 * Leyenda de macros (Proteína / Carbohidratos / Grasa) con punto de color.
 * Mostrar al menos una vez por vista para aclarar el significado de P/C/G.
 */
export function MacroLegend({ className }: { className?: string }) {
  return (
    <ul className={cn('flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted', className)}>
      {MACROS.map((m) => (
        <li key={m.key} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block size-2 rounded-full"
            style={{ backgroundColor: m.colorVar }}
          />
          <span>
            <span className={cn('font-medium', m.textClass)}>{m.short}</span> {m.label}
          </span>
        </li>
      ))}
    </ul>
  );
}
