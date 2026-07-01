import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { requireStudent } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { getStudentFoodLogForEdit } from '@/lib/db/queries/student-nutrition';
import { Card, PageHeader } from '@/components/common';
import { FoodLogForm, type InitialLine } from '@/components/student/FoodLogForm';
import type { FoodUnit } from '@/domain/nutrition/units';
import type { MealType } from '@/types/app';

export const metadata = { title: 'Editar comida' };

const MEAL_TYPES: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack', 'other'];

export default async function EditMealPage({ params }: { params: Promise<{ logId: string }> }) {
  const { logId } = await params;
  const profile = await requireStudent();

  const log = await getStudentFoodLogForEdit(profile.id, logId);
  if (!log) notFound();

  const supabase = await createClient();
  const { data: foods } = await supabase
    .from('food_items')
    .select('id, name, calories_per_100g, protein_per_100g, carbs_per_100g, fat_per_100g, grams_per_unit, unit_label, source, created_by')
    .or(`is_public.eq.true,created_by.eq.${profile.id}`)
    .order('name');

  // Asegura que los alimentos del registro estén en el catálogo (aunque hoy no sean públicos).
  const catalog = foods ?? [];
  const present = new Set(catalog.map((f) => f.id));
  for (const l of log.lines) {
    if (!present.has(l.foodItemId)) {
      catalog.push({
        id: l.foodItemId,
        name: l.name,
        calories_per_100g: l.calories_per_100g,
        protein_per_100g: l.protein_per_100g,
        carbs_per_100g: l.carbs_per_100g,
        fat_per_100g: l.fat_per_100g,
        grams_per_unit: l.grams_per_unit,
        unit_label: l.unit_label,
        source: 'other',
        created_by: null,
      });
      present.add(l.foodItemId);
    }
  }

  const initialMealType: MealType = (MEAL_TYPES as string[]).includes(log.meal_type)
    ? (log.meal_type as MealType)
    : 'other';
  const initialLines: InitialLine[] = log.lines.map((l) => ({
    foodItemId: l.foodItemId,
    name: l.name,
    unit: l.unit as FoodUnit,
    quantity: l.quantity,
  }));

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <Link href="/student/meals" className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground">
        <ArrowLeft className="size-4" /> Mis comidas
      </Link>
      <PageHeader title="Editar comida" description="Ajusta los alimentos o el tipo de comida." />
      <Card className="p-6">
        <FoodLogForm
          foodItems={catalog}
          userId={profile.id}
          editLogId={log.id}
          initialMealType={initialMealType}
          initialNotes={log.notes ?? ''}
          initialLines={initialLines}
          initialDate={log.logged_at.slice(0, 10)}
        />
      </Card>
    </div>
  );
}
