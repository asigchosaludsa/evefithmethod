'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button, FormField, Input } from '@/components/common';
import { cn } from '@/lib/utils/cn';
import { createCustomFood, updateCustomFood, type NewFood } from '@/lib/student/food-actions';

/** Alimento editable (subset de food_items) para precargar el diálogo en modo edición. */
export interface EditableFood {
  id: string;
  name: string;
  calories_per_100g: number;
  protein_per_100g: number;
  carbs_per_100g: number;
  fat_per_100g: number;
  grams_per_unit: number | null;
  unit_label: string | null;
}

export interface CreateFoodDialogProps {
  onSaved: (food: NewFood) => void;
  /** Presente = modo edición del alimento propio. */
  food?: EditableFood;
  /** Controlado (para edición desde una lista); si se omite, usa su propio botón. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}

type Basis = '100g' | 'unit';

function computeCalories(protein: string, carbs: string, fat: string): number {
  const p = Number(protein) || 0;
  const c = Number(carbs) || 0;
  const f = Number(fat) || 0;
  return Math.round(p * 4 + c * 4 + f * 9);
}

function initialState(food?: EditableFood) {
  // Un alimento con grams_per_unit=100 + unidad se creó "por porción".
  const isUnit = !!food && food.grams_per_unit === 100 && !!food.unit_label;
  return {
    basis: (isUnit ? 'unit' : '100g') as Basis,
    name: food?.name ?? '',
    protein: food ? String(food.protein_per_100g) : '',
    carbs: food ? String(food.carbs_per_100g) : '',
    fat: food ? String(food.fat_per_100g) : '',
    calories: food ? String(food.calories_per_100g) : '',
    gramsPerUnit: food && !isUnit && food.grams_per_unit != null ? String(food.grams_per_unit) : '',
    unitLabel: food?.unit_label ?? '',
    caloriesTouched: !!food,
  };
}

/**
 * Cuerpo del formulario. Vive dentro de Dialog.Content, que Radix monta/desmonta
 * al abrir/cerrar — así el estado se reinicia solo en cada apertura (sin efectos).
 */
function FoodForm({
  food,
  onSaved,
  onClose,
}: {
  food?: EditableFood;
  onSaved: (food: NewFood) => void;
  onClose: () => void;
}) {
  const isEdit = !!food;
  const [values, setValues] = React.useState(() => initialState(food));
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function set<K extends keyof typeof values>(key: K, value: (typeof values)[K]) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  const computed = computeCalories(values.protein, values.carbs, values.fat);
  const effectiveCalories = values.caloriesTouched && values.calories !== '' ? Number(values.calories) : computed;
  const isUnit = values.basis === 'unit';
  const macroUnitLabel = isUnit ? `de 1 ${values.unitLabel.trim() || 'porción'}` : 'por 100 g';

  function submit() {
    setError(null);
    if (!values.name.trim()) {
      setError('El nombre es obligatorio.');
      return;
    }
    startTransition(async () => {
      const payload = {
        name: values.name.trim(),
        calories: effectiveCalories,
        protein: Number(values.protein) || 0,
        carbs: Number(values.carbs) || 0,
        fat: Number(values.fat) || 0,
        // Modo "por porción": guardamos los totales como valores por 100 g con
        // grams_per_unit=100, así 1 unidad = exactamente esos macros.
        gramsPerUnit: isUnit ? 100 : values.gramsPerUnit ? Number(values.gramsPerUnit) : null,
        unitLabel: isUnit ? values.unitLabel.trim() || 'porción' : values.unitLabel.trim() || null,
      };
      const res = isEdit ? await updateCustomFood(food!.id, payload) : await createCustomFood(payload);
      if (res.error || !res.food) {
        setError(res.error ?? 'No se pudo guardar el alimento.');
        return;
      }
      onSaved(res.food);
      onClose();
    });
  }

  return (
    <>
      <Dialog.Title className="font-display text-lg font-semibold text-foreground">
        {isEdit ? 'Editar alimento' : 'Crear alimento'}
      </Dialog.Title>
      <Dialog.Description className="mt-1.5 text-sm text-muted">
        {isUnit
          ? 'Ingresa los macros de una porción entera (ej. 1 sándwich). Las calorías se calculan solas.'
          : 'Ingresa los macros por cada 100 g. Las calorías se calculan solas desde los macros.'}
      </Dialog.Description>

      <div className="mt-4 flex rounded-lg border border-border p-0.5">
        {(['100g', 'unit'] as Basis[]).map((b) => (
          <button
            key={b}
            type="button"
            onClick={() => set('basis', b)}
            className={cn(
              'flex-1 rounded-md py-1.5 text-sm font-medium transition-colors',
              values.basis === b ? 'bg-primary text-white' : 'text-muted hover:text-foreground',
            )}
          >
            {b === '100g' ? 'Por 100 g' : 'Por porción'}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-4">
        <FormField label="Nombre" htmlFor="cf_name">
          <Input
            id="cf_name"
            value={values.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder={isUnit ? 'Ej: Sándwich de pollo' : 'Ej: Pan integral casero'}
            autoFocus
          />
        </FormField>

        {isUnit && (
          <FormField label="Nombre de la porción" htmlFor="cf_ulabel" hint="Cómo la cuentas al registrar">
            <Input
              id="cf_ulabel"
              value={values.unitLabel}
              onChange={(e) => set('unitLabel', e.target.value)}
              placeholder="Ej: sándwich, porción, plato"
            />
          </FormField>
        )}

        <div className="grid grid-cols-3 gap-3">
          <FormField label="Proteína" htmlFor="cf_protein">
            <Input id="cf_protein" type="number" inputMode="decimal" min={0} value={values.protein}
              onChange={(e) => set('protein', e.target.value)} placeholder="0" />
          </FormField>
          <FormField label="Carbos" htmlFor="cf_carbs">
            <Input id="cf_carbs" type="number" inputMode="decimal" min={0} value={values.carbs}
              onChange={(e) => set('carbs', e.target.value)} placeholder="0" />
          </FormField>
          <FormField label="Grasas" htmlFor="cf_fat">
            <Input id="cf_fat" type="number" inputMode="decimal" min={0} value={values.fat}
              onChange={(e) => set('fat', e.target.value)} placeholder="0" />
          </FormField>
        </div>
        <p className="text-xs text-muted">Valores {macroUnitLabel}.</p>

        <FormField
          label="Calorías"
          htmlFor="cf_calories"
          hint={`≈ ${computed} kcal calculadas de los macros — edítalas solo si difieren`}
        >
          <Input
            id="cf_calories"
            type="number"
            inputMode="decimal"
            min={0}
            value={values.caloriesTouched ? values.calories : String(computed)}
            onChange={(e) => setValues((v) => ({ ...v, calories: e.target.value, caloriesTouched: true }))}
            placeholder={String(computed)}
          />
        </FormField>

        {!isUnit && (
          <div className="grid grid-cols-2 gap-3">
            <FormField label="Gramos por unidad (opcional)" htmlFor="cf_gpu" hint="Ej: 1 huevo = 50 g">
              <Input id="cf_gpu" type="number" inputMode="decimal" min={0} value={values.gramsPerUnit}
                onChange={(e) => set('gramsPerUnit', e.target.value)} placeholder="Ej: 50" />
            </FormField>
            <FormField label="Nombre de la unidad (opcional)" htmlFor="cf_ulabel2">
              <Input id="cf_ulabel2" value={values.unitLabel}
                onChange={(e) => set('unitLabel', e.target.value)} placeholder="Ej: huevo, rebanada" />
            </FormField>
          </div>
        )}

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>

      <div className="mt-5 flex justify-end gap-2">
        <Dialog.Close asChild>
          <Button variant="ghost" type="button" disabled={pending}>
            Cancelar
          </Button>
        </Dialog.Close>
        <Button variant="primary" type="button" loading={pending} onClick={submit}>
          {isEdit ? 'Guardar' : 'Crear'}
        </Button>
      </div>
    </>
  );
}

export function CreateFoodDialog({ onSaved, food, open, onOpenChange }: CreateFoodDialogProps) {
  const controlled = open !== undefined;
  const [internalOpen, setInternalOpen] = React.useState(false);
  const isOpen = controlled ? open! : internalOpen;

  function setOpen(next: boolean) {
    if (controlled) onOpenChange?.(next);
    else setInternalOpen(next);
  }

  return (
    <Dialog.Root open={isOpen} onOpenChange={setOpen}>
      {!controlled && (
        <Dialog.Trigger asChild>
          <Button variant="ghost" size="sm" type="button">
            + Crear alimento
          </Button>
        </Dialog.Trigger>
      )}
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-[fade_150ms_ease-out]" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
            'rounded-xl border border-border bg-elevated p-5 shadow-2xl',
            'data-[state=open]:animate-[dialogIn_180ms_ease-out]',
          )}
        >
          {/* key remonta el formulario al cambiar de alimento → estado fresco. */}
          <FoodForm key={food?.id ?? 'new'} food={food} onSaved={onSaved} onClose={() => setOpen(false)} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
