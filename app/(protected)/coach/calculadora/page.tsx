import { requireCoach } from '@/lib/auth/roles';
import { createClient } from '@/lib/supabase/server';
import { CalcWizard } from './CalcWizard';

export const metadata = { title: 'Calculadora de Calorías' };

export interface StudentOption {
  id: string;
  name: string;
  height_cm: number | null;
  current_weight_kg: number | null;
  date_of_birth: string | null;
}

export default async function CalcPage() {
  const coach = await requireCoach();
  const supabase = await createClient();

  const { data: links } = await supabase
    .from('coach_students')
    .select('student_id')
    .eq('coach_id', coach.id)
    .eq('status', 'active');

  const ids = (links ?? []).map((l) => l.student_id);

  let students: StudentOption[] = [];
  if (ids.length > 0) {
    const [{ data: profiles }, { data: sps }] = await Promise.all([
      supabase.from('profiles').select('id, full_name').in('id', ids),
      supabase
        .from('student_profiles')
        .select('user_id, height_cm, current_weight_kg, date_of_birth')
        .in('user_id', ids),
    ]);

    students = (profiles ?? []).map((p) => {
      const sp = (sps ?? []).find((s) => s.user_id === p.id);
      return {
        id: p.id,
        name: p.full_name ?? 'Alumna',
        height_cm: sp?.height_cm ?? null,
        current_weight_kg: sp?.current_weight_kg ?? null,
        date_of_birth: sp?.date_of_birth ?? null,
      };
    });
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Calculadora de Calorías</h1>
        <p className="mt-1 text-sm text-muted">
          Mifflin-St Jeor · Katch-McArdle · ISSN 2018
        </p>
      </div>
      <CalcWizard students={students} />
    </div>
  );
}
