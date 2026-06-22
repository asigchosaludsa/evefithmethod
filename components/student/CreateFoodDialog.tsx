'use client';

import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import { Button, FormField, Input } from '@/components/common';
import { cn } from '@/lib/utils/cn';
import { createCustomFood, type NewFood } from '@/lib/student/food-actions';

export interface CreateFoodDialogProps {
  onCreated: (food: NewFood) => void;
}

const EMPTY = { name: '', calories: '', protein: '', carbs: '', fat: '' };

export function CreateFoodDialog({ onCreated }: CreateFoodDialogProps) {
  const [open, setOpen] = React.useState(false);
  const [values, setValues] = React.useState(EMPTY);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();

  function reset() {
    setValues(EMPTY);
    setError(null);
  }

  function set<K extends keyof typeof EMPTY>(key: K, value: string) {
    setValues((v) => ({ ...v, [key]: value }));
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const res = await createCustomFood({
        name: values.name.trim(),
        calories: Number(values.calories) || 0,
        protein: Number(values.protein) || 0,
        carbs: Number(values.carbs) || 0,
        fat: Number(values.fat) || 0,
      });
      if (res.error || !res.food) {
        setError(res.error ?? 'No se pudo crear el alimento.');
        return;
      }
      onCreated(res.food);
      setOpen(false);
      reset();
    });
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (!next) reset();
  }

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size="sm" type="button">
          + Crear alimento
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-[2px] data-[state=open]:animate-[fade_150ms_ease-out]" />
        <Dialog.Content
          className={cn(
            'fixed left-1/2 top-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 -translate-y-1/2',
            'rounded-xl border border-border bg-elevated p-5 shadow-2xl',
            'data-[state=open]:animate-[dialogIn_180ms_ease-out]',
          )}
        >
          <Dialog.Title className="font-display text-lg font-semibold text-foreground">
            Crear alimento
          </Dialog.Title>
          <Dialog.Description className="mt-1.5 text-sm text-muted">
            Agrega un alimento privado con sus macros por cada 100 g.
          </Dialog.Description>

          <div className="mt-4 space-y-4">
            <FormField label="Nombre" htmlFor="cf_name">
              <Input
                id="cf_name"
                value={values.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ej: Pan integral casero"
                autoFocus
              />
            </FormField>

            <FormField label="Calorías (por 100 g)" htmlFor="cf_calories">
              <Input
                id="cf_calories"
                type="number"
                inputMode="decimal"
                min={0}
                value={values.calories}
                onChange={(e) => set('calories', e.target.value)}
                placeholder="0"
              />
            </FormField>

            <div className="grid grid-cols-3 gap-3">
              <FormField label="Proteína" htmlFor="cf_protein">
                <Input
                  id="cf_protein"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={values.protein}
                  onChange={(e) => set('protein', e.target.value)}
                  placeholder="0"
                />
              </FormField>
              <FormField label="Carbos" htmlFor="cf_carbs">
                <Input
                  id="cf_carbs"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={values.carbs}
                  onChange={(e) => set('carbs', e.target.value)}
                  placeholder="0"
                />
              </FormField>
              <FormField label="Grasas" htmlFor="cf_fat">
                <Input
                  id="cf_fat"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  value={values.fat}
                  onChange={(e) => set('fat', e.target.value)}
                  placeholder="0"
                />
              </FormField>
            </div>

            {error && <p className="text-sm text-danger">{error}</p>}
          </div>

          <div className="mt-5 flex justify-end gap-2">
            <Dialog.Close asChild>
              <Button variant="ghost" type="button" disabled={pending}>
                Cancelar
              </Button>
            </Dialog.Close>
            <Button variant="primary" type="button" loading={pending} onClick={submit}>
              Crear
            </Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
