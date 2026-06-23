import Link from 'next/link';
import {
  Moon,
  Droplet,
  Utensils,
  Dumbbell,
  Brain,
  HeartPulse,
  Footprints,
  Sun,
  Lightbulb,
  ArrowRight,
  type LucideIcon,
} from 'lucide-react';
import { Card, CardBody } from '@/components/common';

export interface CoachTip {
  title: string;
  summary: string | null;
}

interface TipVisual {
  icon: LucideIcon;
  /** Categoría legible (etiqueta del banner). */
  label: string;
}

/**
 * Mapea de forma DETERMINISTA el título/summary de un tip a un icono + etiqueta
 * de categoría. Sin generación externa de imágenes ni migraciones: la "imagen"
 * es un icono de lucide sobre un banner con tinte escarlata. Las reglas se
 * evalúan en orden; la primera coincidencia gana. Default: bombilla ("idea").
 */
export function tipVisual(title: string, summary: string | null): TipVisual {
  const haystack = `${title} ${summary ?? ''}`.toLowerCase();
  const has = (...words: string[]) => words.some((w) => haystack.includes(w));

  if (has('sueñ', 'dormir', 'descans', 'noche', 'siesta')) return { icon: Moon, label: 'Descanso' };
  if (has('agua', 'hidrat', 'beber', 'líquido', 'liquido')) return { icon: Droplet, label: 'Hidratación' };
  if (has('proteín', 'protein', 'comida', 'comer', 'aliment', 'nutric', 'macro', 'dieta', 'merienda'))
    return { icon: Utensils, label: 'Nutrición' };
  if (has('entren', 'ejercicio', 'pesas', 'fuerza', 'gimnasio', 'rutina', 'serie', 'repetic'))
    return { icon: Dumbbell, label: 'Entrenamiento' };
  if (has('camin', 'paso', 'cardio', 'corr', 'movili'))
    return { icon: Footprints, label: 'Actividad' };
  if (has('estrés', 'estres', 'mente', 'ánimo', 'animo', 'mental', 'calma', 'medita', 'respira'))
    return { icon: Brain, label: 'Mente' };
  if (has('corazón', 'corazon', 'salud', 'recuper', 'lesión', 'lesion', 'dolor'))
    return { icon: HeartPulse, label: 'Salud' };
  if (has('mañana', 'manana', 'rutina diaria', 'hábito', 'habito', 'mañanera'))
    return { icon: Sun, label: 'Hábitos' };

  return { icon: Lightbulb, label: 'Consejo' };
}

/**
 * Tarjeta del tip de la coach con más protagonismo: banner con tinte escarlata e
 * icono derivado de la categoría del tip (deterministicamente), título, resumen y
 * enlace a /student/content. Server component; la animación de entrada es CSS
 * (clase efm-fade-up aplicada por el contenedor). Si no hay tip, muestra un estado
 * vacío acogedor.
 */
export function CoachTipCard({ tip }: { tip: CoachTip | null }) {
  if (!tip) {
    return (
      <Card className="h-full overflow-hidden">
        <div className="flex items-center gap-2 border-b border-hairline bg-elevated px-5 py-3 text-muted">
          <Lightbulb className="size-4" />
          <span className="text-xs font-medium uppercase tracking-wide">Tip de tu coach</span>
        </div>
        <CardBody className="flex h-full flex-col justify-center gap-2 py-8 text-center">
          <p className="font-medium text-foreground">Tu coach te dejará tips aquí</p>
          <p className="text-sm text-muted">
            Consejos y contenido personalizado aparecerán en esta tarjeta.
          </p>
        </CardBody>
      </Card>
    );
  }

  const { icon: Icon, label } = tipVisual(tip.title, tip.summary);

  return (
    <Card className="group h-full overflow-hidden">
      <Link href="/student/content" className="flex h-full flex-col">
        {/* Banner con tinte escarlata + icono de categoría. */}
        <div className="relative flex items-center gap-3 overflow-hidden border-b border-hairline bg-gradient-to-br from-primary/20 via-primary/8 to-transparent px-5 py-4">
          <div
            className="absolute -right-6 -top-6 size-24 rounded-full bg-primary/10 blur-2xl"
            aria-hidden
          />
          <div className="relative flex size-12 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary ring-1 ring-primary/25">
            <Icon className="size-6" />
          </div>
          <span className="relative text-xs font-semibold uppercase tracking-wide text-primary">
            {label}
          </span>
        </div>

        <CardBody className="flex flex-1 flex-col gap-1.5 pt-4">
          <p className="font-semibold text-foreground group-hover:text-primary">{tip.title}</p>
          {tip.summary && <p className="text-sm leading-relaxed text-muted">{tip.summary}</p>}
          <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
            Ver contenido <ArrowRight className="size-3.5" />
          </span>
        </CardBody>
      </Link>
    </Card>
  );
}
