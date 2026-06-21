import { AuthShell } from '@/components/auth/AuthShell';
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm';

export const metadata = { title: 'Nueva contraseña' };

export default function UpdatePasswordPage() {
  return (
    <AuthShell title="Crea tu nueva contraseña" subtitle="Elige una contraseña segura">
      <UpdatePasswordForm />
    </AuthShell>
  );
}
