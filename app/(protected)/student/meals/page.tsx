import Link from 'next/link';
import { Plus } from 'lucide-react';
import { requireStudent } from '@/lib/auth/roles';
import {
  getStudentMealsForDay,
  getStudentNutritionRange,
} from '@/lib/db/queries/student-nutrition';
import { Button, Card, CardBody, CardHeader, CardTitle, PageHeader } from '@/components/common';
import { MealsCalendar } from '@/components/student/MealsCalendar';
import { MealDayDetail } from '@/components/student/MealDayDetail';
import { addDaysISO } from '@/domain/workouts/calendar';
import { todayISO as getTodayISO } from '@/lib/utils/date';

export const metadata = { title: 'Mis comidas' };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

const MONTHS = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
];

function formatHumanDay(dateISO: string): string {
  const parts = dateISO.split('-').map(Number);
  const day = parts[2] ?? 1;
  const monthName = MONTHS[(parts[1] ?? 1) - 1] ?? '';
  return `${day} de ${monthName}`;
}

export default async function StudentMealsPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const profile = await requireStudent();
  const { date } = await searchParams;

  const todayISO = getTodayISO();
  const selectedISO = date && ISO_DATE.test(date) ? date : todayISO;

  // Rango del calendario: ~5 semanas atrás hasta hoy (cubre semana/mes).
  const rangeStartISO = addDaysISO(todayISO, -34);
  const rangeEndISO = todayISO >= selectedISO ? todayISO : selectedISO;

  const [range, day] = await Promise.all([
    getStudentNutritionRange(profile.id, rangeStartISO, rangeEndISO),
    getStudentMealsForDay(profile.id, selectedISO),
  ]);

  const isToday = selectedISO === todayISO;
  const dayLabel = isToday ? 'Hoy' : formatHumanDay(selectedISO);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Mis comidas"
        description="Revisa cualquier día y gestiona tus registros."
        actions={
          <Button asChild>
            <Link href={`/student/meals/new?date=${selectedISO}`}>
              <Plus className="size-4" /> Registrar comida
            </Link>
          </Button>
        }
      />

      <Card>
        <CardHeader>
          <CardTitle>Calendario</CardTitle>
        </CardHeader>
        <CardBody>
          <MealsCalendar byDate={range.byDate} selectedISO={selectedISO} todayISO={todayISO} />
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{dayLabel}</CardTitle>
        </CardHeader>
        <CardBody>
          <MealDayDetail day={day} />
          <div className="mt-4">
            <Button asChild variant="outline" className="w-full">
              <Link href={`/student/meals/new?date=${selectedISO}`}>
                <Plus className="size-4" />
                {isToday ? 'Registrar otra comida' : `Registrar comida del ${formatHumanDay(selectedISO)}`}
              </Link>
            </Button>
          </div>
        </CardBody>
      </Card>
    </div>
  );
}
