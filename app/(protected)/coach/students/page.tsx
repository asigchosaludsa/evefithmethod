import Link from 'next/link';
import { UserPlus } from 'lucide-react';
import { requireCoach } from '@/lib/auth/roles';
import { getCoachStudents } from '@/lib/db/queries/coach';
import { Button, EmptyState, PageHeader } from '@/components/common';
import { StudentList } from '@/components/coach/StudentList';

export const metadata = { title: 'Alumnas' };

export default async function CoachStudentsPage() {
  const profile = await requireCoach();
  const students = await getCoachStudents(profile.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Alumnas"
        description={`${students.length} ${students.length === 1 ? 'alumna activa' : 'alumnas activas'}`}
        actions={
          <Button asChild>
            <Link href="/coach/students/invite">
              <UserPlus className="size-4" /> Invitar
            </Link>
          </Button>
        }
      />

      {students.length === 0 ? (
        <EmptyState
          title="Aún no tienes alumnas"
          description="Invita a tu primera alumna para empezar."
          action={
            <Button asChild>
              <Link href="/coach/students/invite">
                <UserPlus className="size-4" /> Invitar alumna
              </Link>
            </Button>
          }
        />
      ) : (
        <StudentList students={students} />
      )}
    </div>
  );
}
