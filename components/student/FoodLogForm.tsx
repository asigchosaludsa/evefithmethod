'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Trash2 } from 'lucide-react';
import { logFood } from '@/lib/student/actions';
import { calculateFoodMacros, calculateMealTotals } from '@/domain/nutrition/calculations';
import { Button, FormField, Input, Select, Textarea } from '@/components/common';
import type { MealType } from '@/types/app';

export interface FoodOption {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
}

interface Line {
  foodItemId: string;
  name: string;
  grams: number;
}

const MEAL_OPTIONS: { value: MealType; label: string }[] = [
  { value: 'breakfast', label: 'Desayuno' },
  { value: 'lunch', label: 'Almuerzo' },
  { value: 'dinner', label: 'Cena' },
  { value: 'snack', label: 'Snack' },
  { value: 'other', label: 'Otro' },
];

export function FoodLogForm({ foodItems }: { foodItems: FoodOption[] }) {
  const router = useRouter();
  const [mealType, setMealType] = useState<MealType>('breakfast');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);
  const [q, setQ] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const foodMap = useMemo(() => new Map(foodItems.map((f) => [f.id, f])), [foodItems]);
  const matches = useMemo(
    () =>
      q.trim()
        ? foodItems.filter((f) => f.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 8)
        : [],
    [q, foodItems],
  );
  const totals = useMemo(
    () =>
      calculateMealTotals(
        lines.map((l) => {
          const f = foodMap.get(l.foodItemId);
          return f ? calculateFoodMacros(f, l.grams) : { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
        }),
      ),
    [lines, foodMap],
  );

  function addFood(f: FoodOption) {
    setLines((ls) => [...ls, { foodItemId: f.id, name: f.name, grams: 100 }]);
    setQ('');
  }

  function submit() {
    setError(null);
    if (lines.length === 0) {
      setError('Agrega al menos un alimento.');
      return;
    }
    startTransition(async () => {
      const res = await logFood({
        mealType,
        notes: notes || undefined,
        items: lines.map((l) => ({ foodItemId: l.foodItemId, grams: l.grams })),
      });
      if (res.error) {
        setError(res.error);
        return;
      }
      router.push('/student/today');
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
      </FormField>

      {lines.length > 0 && (
        <ul className="space-y-2">
          {lines.map((l, i) => {
            const f = foodMap.get(l.foodItemId);
            const m = f ? calculateFoodMacros(f, l.grams) : { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 };
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
                <div className="mt-2 flex items-center gap-3">
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      inputMode="decimal"
                      value={l.grams}
                      min={1}
                      onChange={(e) =>
                        setLines((ls) =>
                          ls.map((x, idx) => (idx === i ? { ...x, grams: Number(e.target.value) || 0 } : x)),
                        )
                      }
                      className="h-8 w-20"
                    />
                    <span className="text-xs text-faint">g</span>
                  </div>
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

      {error && <p className="text-sm text-danger">{error}</p>}
      <Button onClick={submit} loading={pending} className="w-full" size="lg">
        Guardar registro
      </Button>
    </div>
  );
}
