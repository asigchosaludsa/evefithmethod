'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Camera, Check, Search, Trash2 } from 'lucide-react';
import { logFood, updateFoodLog } from '@/lib/student/actions';
import { createClient } from '@/lib/supabase/client';
import { compressImage, uploadInfoFor } from '@/lib/utils/compress-image';
import { calculateFoodMacros, calculateMealTotals } from '@/domain/nutrition/calculations';
import { toGrams, availableUnits, type FoodUnit } from '@/domain/nutrition/units';
import { Button, FormField, Input, Select, Textarea } from '@/components/common';
import { CreateFoodDialog } from '@/components/student/CreateFoodDialog';
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

export function FoodLogForm({
  foodItems,
  userId,
  editLogId,
  initialMealType,
  initialNotes,
  initialLines,
}: {
  foodItems: FoodOption[];
  userId: string;
  /** Si está presente, el formulario edita ese registro en vez de crear uno nuevo. */
  editLogId?: string;
  initialMealType?: MealType;
  initialNotes?: string;
  initialLines?: InitialLine[];
}) {
  const router = useRouter();
  const isEdit = !!editLogId;
  const [mealType, setMealType] = useState<MealType>(initialMealType ?? 'breakfast');
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

  function addFood(f: FoodOption) {
    setLines((ls) => [...ls, { foodItemId: f.id, name: f.name, quantity: 100, unit: 'g' }]);
    setQ('');
  }

  function handleCreated(food: NewFood) {
    setFoods((fs) => (fs.some((f) => f.id === food.id) ? fs : [food, ...fs]));
    addFood(food);
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
        ? await updateFoodLog(editLogId, { mealType, notes: notes || undefined, items })
        : await logFood({ mealType, notes: notes || undefined, photoPath, items });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push(isEdit ? '/student/meals' : '/student/today');
    });
  }

  return (
    <div className="space-y-5">
      <FormField label="Tipo de comida" htmlFor="meal_type">
        <Select id="meal_type" value={mealType} onChange={(e) => setMealType(e.target.value as MealType)}>
          {MEAL_OPTIONS.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
            </option>
          ))}
        </Select>
      </FormField>

      <FormField label="Buscar alimento">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ej: pollo, arroz, yogur…"
            className="pl-9"
          />
          {matches.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-elevated py-1 shadow-xl">
              {matches.map((f) => (
                <li key={f.id}>
                  <button
                    type="button"
                    onClick={() => addFood(f)}
                    className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-surface"
                  >
                    <span className="text-foreground">{f.name}</span>
                    <span className="text-xs text-faint">{f.calories_per_100g} kcal/100g</span>
                  </button>
                </li>
              ))}
            </ul>
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
                  <p className="tabular text-xs text-muted">
                    {m.calories} kcal · P {m.protein_g} · C {m.carbs_g} · G {m.fat_g}
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
        <p className="tabular text-sm text-muted">
          P {totals.protein_g}g · C {totals.carbs_g}g · G {totals.fat_g}g
        </p>
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
