'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Check, Globe, Loader2, Search, Trash2 } from 'lucide-react';
import { logFood, updateFoodLog } from '@/lib/student/actions';
import { createClient } from '@/lib/supabase/client';
import { compressImage, uploadInfoFor } from '@/lib/utils/compress-image';
import { calculateFoodMacros, calculateMealTotals } from '@/domain/nutrition/calculations';
import { toGrams, availableUnits, type FoodUnit } from '@/domain/nutrition/units';
import { Button, FormField, Input, Select, Textarea } from '@/components/common';
import { CreateFoodDialog } from '@/components/student/CreateFoodDialog';
import { MacroLine, MacroLegend } from '@/components/nutrition/MacroLine';
import {
  searchOpenFoodFacts,
  importOpenFoodFactsItem,
  type OffProduct,
} from '@/lib/nutrition/openfoodfacts';
import type { NewFood } from '@/lib/student/food-actions';
import type { MealType } from '@/types/app';

export interface FoodOption {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  grams_per_unit: number | null;
  unit_label: string | null;
}

interface Line {
  foodItemId: string;
  name: string;
  quantity: number;
  unit: FoodUnit;
}

function unitLabelFor(unit: FoodUnit, food: FoodOption | undefined): string {
  if (unit === 'unit') return food?.unit_label ?? 'unidad';
  return unit;
}

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Desayuno' },
  { value: 'lunch', label: 'Almuerzo' },
  { value: 'dinner', label: 'Cena' },
  { value: 'snack', label: 'Snack' },
  { value: 'other', label: 'Otro' },
];

export interface InitialLine {
  foodItemId: string;
  name: string;
  unit: FoodUnit;
  quantity: number;
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Etiqueta humana del día: "hoy", "ayer" o "lunes 30 de junio". */
function humanDay(iso: string): string {
  const today = todayStr();
  const d = new Date(`${iso}T12:00:00`);
  if (iso === today) return 'hoy';
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  if (iso === yesterday.toISOString().slice(0, 10)) return 'ayer';
  return d.toLocaleDateString('es-EC', { weekday: 'long', day: 'numeric', month: 'long' });
}

export function FoodLogForm({
  foodItems,
  userId,
  editLogId,
  initialMealType,
  initialNotes,
  initialLines,
  initialDate,
}: {
  foodItems: FoodOption[];
  userId: string;
  /** Si está presente, el formulario edita ese registro en vez de crear uno nuevo. */
  editLogId?: string;
  initialMealType?: MealType;
  initialNotes?: string;
  initialLines?: InitialLine[];
  /** Día preseleccionado (YYYY-MM-DD) para el registro. Ausente = hoy. */
  initialDate?: string;
}) {
  const router = useRouter();
  const isEdit = !!editLogId;
  const [mealType, setMealType] = useState<MealType>(initialMealType ?? 'breakfast');
  const [loggedDate, setLoggedDate] = useState<string>(initialDate ?? todayStr());
  const [notes, setNotes] = useState(initialNotes ?? '');
  const [lines, setLines] = useState<Line[]>(
    initialLines?.map((l) => ({ foodItemId: l.foodItemId, name: l.name, quantity: l.quantity, unit: l.unit })) ?? [],
  );
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [foods, setFoods] = useState<FoodOption[]>(foodItems);
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  // --- Búsqueda en Open Food Facts (base mundial, fail-soft) ---
  const [offResults, setOffResults] = useState<OffProduct[]>([]);
  const [offLoading, setOffLoading] = useState(false);
  const [importingCode, setImportingCode] = useState<string | null>(null);
  const offReqId = useRef(0);

  async function onPhoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setPhotoBusy(true);
    try {
      const blob = await compressImage(file);
      const info = uploadInfoFor(blob);
      if (!info) {
        setError('No pudimos procesar la imagen. Intenta con una foto JPG, PNG o WEBP.');
        return;
      }
      if (blob.size > 6 * 1024 * 1024) {
        setError('La foto es demasiado grande.');
        return;
      }
      const supabase = createClient();
      const path = `${userId}/${Date.now()}.${info.ext}`;
      const { error: upErr } = await supabase.storage
        .from('food-photos')
        .upload(path, blob, { contentType: info.contentType, upsert: false });
      if (upErr) setError(upErr.message);
      else setPhotoPath(path);
    } finally {
      setPhotoBusy(false);
    }
  }

  const foodMap = useMemo(() => new Map(foods.map((f) => [f.id, f])), [foods]);
  const matches = useMemo(
    () =>
      q.trim()
        ? foods.filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
        : [],
    [q, foods],
  );
  const totals = useMemo(
    () =>
      calculateMealTotals(
        lines.map((l) => {
          const f = foodMap.get(l.foodItemId);
          if (!f) return { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
          const grams = toGrams(l.quantity, l.unit, f.grams_per_unit);
          return calculateFoodMacros(f, grams);
        }),
      ),
    [lines, foodMap],
  );

  // Búsqueda OFF con debounce (~400ms) cuando la consulta tiene ≥ 3 caracteres.
  // Todo `setState` ocurre dentro del timer (asíncrono), no en el cuerpo del
  // efecto, para no disparar renders en cascada.
  useEffect(() => {
    const term = q.trim();
    const reqId = ++offReqId.current;

    if (term.length < 3) {
      // Limpia resultados en una microtarea; evita setState síncrono en el efecto.
      const clear = setTimeout(() => {
        if (offReqId.current !== reqId) return;
        setOffResults([]);
        setOffLoading(false);
      }, 0);
      return () => clearTimeout(clear);
    }

    const start = setTimeout(() => {
      if (offReqId.current === reqId) setOffLoading(true);
    }, 0);

    const handle = setTimeout(async () => {
      try {
        const results = await searchOpenFoodFacts(term);
        // Ignora respuestas de búsquedas obsoletas (la query ya cambió).
        if (offReqId.current === reqId) setOffResults(results);
      } catch {
        if (offReqId.current === reqId) setOffResults([]);
      } finally {
        if (offReqId.current === reqId) setOffLoading(false);
      }
    }, 400);

    return () => {
      clearTimeout(start);
      clearTimeout(handle);
    };
  }, [q]);

  function addFood(f: FoodOption) {
    setLines((ls) => [...ls, { foodItemId: f.id, name: f.name, quantity: 100, unit: 'g' }]);
    setQ('');
    setOffResults([]);
  }

  function handleCreated(food: NewFood) {
    setFoods((fs) => (fs.some((f) => f.id === food.id) ? fs : [food, ...fs]));
    addFood(food);
  }

  // Importa un producto OFF como food_item y lo agrega como línea.
  function pickOffProduct(product: OffProduct) {
    if (importingCode) return;
    setError(null);
    setImportingCode(product.code);
    startTransition(async () => {
      const res = await importOpenFoodFactsItem(product);
      setImportingCode(null);
      if (res.error || !res.food) {
        setError(res.error ?? 'No se pudo importar el alimento.');
        return;
      }
      handleCreated(res.food);
    });
  }

  function submit() {
    setError(null);
    if (lines.length === 0) {
      setError('Agrega al menos un alimento.');
      return;
    }
    startTransition(async () => {
      const items = lines.map((l) => ({ foodItemId: l.foodItemId, unit: l.unit, quantity: l.quantity }));
      const res = isEdit
        ? await updateFoodLog(editLogId, { mealType, notes: notes || undefined, loggedDate, items })
        : await logFood({ mealType, notes: notes || undefined, photoPath, loggedDate, items });
      if (res.error) {
        setError(res.error);
        return;
      }
      // Tras guardar, ir a la vista del día registrado (donde puede ver/editar/borrar).
      router.push(`/student/meals?date=${loggedDate}`);
      router.refresh();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-md border border-primary/30 bg-primary/5 px-3 py-2 text-sm text-foreground">
        Registro de comida del <span className="font-semibold capitalize">{humanDay(loggedDate)}</span>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Tipo de comida" htmlFor="meal_type">
          <Select id="meal_type" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
            {MEAL_OPTIONS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Día" htmlFor="logged_date" hint="Puedes registrar comidas de días pasados.">
          <Input
            id="logged_date"
            type="date"
            value={loggedDate}
            max={todayStr()}
            onChange={(e) => setLoggedDate(e.target.value || todayStr())}
          />
        </FormField>
      </div>

      <FormField label="Buscar alimento" hint="Busca en tus alimentos y en la base mundial (Open Food Facts).">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej: pollo, arroz, arándanos…"
            className="pl-9"
          />
          {offLoading && (
            <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-faint" aria-hidden />
          )}
          {(matches.length > 0 || offResults.length > 0 || (q.trim().length >= 3 && offLoading)) && (
            <div className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-md border border-border bg-elevated py-1 shadow-xl">
              {matches.length > 0 && (
                <ul>
                  <li className="px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-faint">
                    Tus alimentos
                  </li>
                  {matches.map((f) => (
                    <li key={f.id}>
                      <button
                        type="button"
                        onClick={() => addFood(f)}
                        className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface"
                      >
                        <span className="text-foreground">{f.name}</span>
                        <span className="tabular text-xs text-faint">{f.calories_per_100g} kcal/100g</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}

              {q.trim().length >= 3 && (matches.length > 0 ? <div className="my-1 border-t border-hairline" /> : null)}

              {q.trim().length >= 3 && (
                <ul>
                  <li className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-medium uppercase tracking-wide text-faint">
                    <Globe className="size-3" aria-hidden /> Resultados de la base mundial
                  </li>
                  {offResults.map((p) => (
                    <li key={p.code}>
                      <button
                        type="button"
                        onClick={() => pickOffProduct(p)}
                        disabled={!!importingCode}
                        className="flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm hover:bg-surface disabled:opacity-60"
                      >
                        <span className="min-w-0 truncate text-foreground">{p.name}</span>
                        <span className="tabular flex shrink-0 items-center gap-1.5 text-xs text-faint">
                          {p.calories_per_100g} kcal/100g
                          {importingCode === p.code && <Loader2 className="size-3 animate-spin" aria-hidden />}
                        </span>
                      </button>
                    </li>
                  ))}
                  {offLoading && offResults.length === 0 && (
                    <li className="px-3 py-2 text-xs text-faint">Buscando en la base mundial…</li>
                  )}
                  {!offLoading && offResults.length === 0 && (
                    <li className="px-3 py-2 text-xs text-faint">Sin coincidencias en la base mundial.</li>
                  )}
                </ul>
              )}
            </div>
          )}
        </div>
        <div className="mt-2 flex justify-end">
          <CreateFoodDialog onCreated={handleCreated} />
        </div>
      </FormField>

      {lines.length > 0 && (
        <ul className="space-y-2">
          {lines.map((l, i) => {
            const f = foodMap.get(l.foodItemId);
            const grams = f ? toGrams(l.quantity, l.unit, f.grams_per_unit) : 0;
            const m = f ? calculateFoodMacros(f, grams) : { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
            const units = f ? availableUnits(f) : (['g', 'ml'] as FoodUnit[]);
            return (
              <li key={`${l.foodItemId}-${i}`} className="rounded-md border border-hairline bg-canvas/40 p-3">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{l.name}</span>
                  <button
                    type="button"
                    onClick={() => setLines((ls) => ls.filter((_, idx) => idx !== i))}
                    className="text-faint hover:text-danger"
                    aria-label="Quitar"
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={l.quantity}
                      min={0}
                      step="any"
                      onChange={(e) =>
                        setLines((ls) =>
                          ls.map((x, idx) => (idx === i ? { ...x, quantity: Number(e.target.value) || 0 } : x)),
                        )
                      }
                      className="h-8 w-20"
                    />
                    <Select
                      value={l.unit}
                      onChange={(e) =>
                        setLines((ls) =>
                          ls.map((x, idx) => (idx === i ? { ...x, unit: e.target.value as FoodUnit } : x)),
                        )
                      }
                      className="h-8 w-28"
                    >
                      {units.map((u) => (
                        <option key={u} value={u}>
                          {unitLabelFor(u, f)}
                        </option>
                      ))}
                    </Select>
                  </div>
                  {l.unit !== 'g' && <span className="text-xs text-faint">= {grams} g</span>}
                  <p className="text-xs">
                    <span className="tabular text-muted">{m.calories} kcal</span>
                    <span className="mx-1.5 text-faint">·</span>
                    <MacroLine macros={m} className="text-xs" />
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="rounded-md border border-border bg-surface p-3">
        <p className="text-xs uppercase tracking-wide text-muted">Total del registro</p>
        <p className="tabular mt-1 font-display text-lg font-bold text-foreground">
          {totals.calories} kcal
        </p>
        <MacroLine macros={totals} unit="g" className="text-sm" />
        <MacroLegend className="mt-3 border-t border-hairline pt-3" />
      </div>

      <FormField label="Nota" htmlFor="notes" hint="Opcional">
        <Textarea id="notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
      </FormField>

      {!isEdit && (
        <FormField label="Foto (opcional)">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-md border border-border bg-surface px-3 py-2 text-sm text-muted transition-colors hover:text-foreground">
            <input type="file" accept="image/*" onChange={onPhoto} className="hidden" />
            {photoBusy ? (
              'Subiendo…'
            ) : photoPath ? (
              <>
                <Check className="size-4 text-success" /> Foto adjunta
              </>
            ) : (
              <>
                <Camera className="size-4" /> Adjuntar foto
              </>
            )}
          </label>
        </FormField>
      )}

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={submit} loading={pending} className="w-full" size="lg">
        {isEdit ? 'Guardar cambios' : 'Guardar registro'}
      </Button>
    </div>
  );
}
