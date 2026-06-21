import { LogOut } from 'lucide-react';
import { signOut } from '@/lib/auth/actions';
import { cn } from '@/lib/utils/cn';

/** Real logout: posts to a server action that clears the Supabase session. */
export function LogoutButton({ className }: { className?: string }) {
  return (
    <form action={signOut}>
      <button
        type="submit"
        className={cn(
          'flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-muted',
          'transition-colors duration-150 ease-out hover:bg-elevated hover:text-foreground',
          className,
        )}
      >
        <LogOut className="size-4" aria-hidden />
        Cerrar sesión
      </button>
    </form>
  );
}
