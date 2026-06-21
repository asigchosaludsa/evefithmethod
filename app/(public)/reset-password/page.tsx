import { AuthShell } from '@/components/auth/AuthShell';
import { UpdatePasswordForm } from '@/components/auth/UpdatePasswordForm';

export const metadata = { title: 'Restablecer contraseña' };

export default function ResetPasswordPage() {
  return (
    <AuthShell title="Restablece tu contraseña" subtitle="Ingresa tu nueva contraseña">
      <UpdatePasswordForm />
    </AuthShell>
  );
}
