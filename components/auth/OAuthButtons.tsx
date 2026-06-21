import { signInWithApple, signInWithFacebook, signInWithGoogle } from '@/lib/auth/actions';
import { Button } from '@/components/common';

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6s2.7-6 6-6c1.9 0 3.1.8 3.9 1.5l2.7-2.6C16.9 2.9 14.7 2 12 2 6.9 2 2.8 6.1 2.8 11.2S6.9 20.4 12 20.4c6.1 0 8.5-4.3 8.5-7.6 0-.5 0-.9-.1-1.3H12z"
      />
    </svg>
  );
}
function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden>
      <path
        fill="#1877F2"
        d="M22 12a10 10 0 1 0-11.6 9.9v-7H7.9V12h2.5V9.8c0-2.5 1.5-3.9 3.8-3.9 1.1 0 2.2.2 2.2.2v2.5h-1.3c-1.2 0-1.6.8-1.6 1.6V12h2.8l-.4 2.9h-2.4v7A10 10 0 0 0 22 12Z"
      />
    </svg>
  );
}
function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="size-4 fill-foreground" aria-hidden>
      <path d="M16.4 12.7c0-2.1 1.7-3.1 1.8-3.2-1-1.4-2.5-1.6-3-1.7-1.3-.1-2.5.8-3.1.8-.6 0-1.6-.7-2.7-.7-1.4 0-2.7.8-3.4 2-1.4 2.5-.4 6.2 1 8.2.7 1 1.4 2.1 2.5 2.1 1 0 1.4-.6 2.6-.6s1.5.6 2.6.6 1.8-1 2.4-2c.8-1.1 1.1-2.2 1.1-2.3-.1 0-2.2-.8-2.3-3.2ZM14.6 6.3c.5-.7.9-1.6.8-2.5-.8 0-1.8.5-2.4 1.2-.5.6-1 1.5-.8 2.4.9 0 1.8-.4 2.4-1.1Z" />
    </svg>
  );
}

/** Social sign-in buttons. Each posts to a server action that redirects to the provider. */
export function OAuthButtons() {
  return (
    <div className="space-y-2">
      <form action={signInWithGoogle}>
        <Button type="submit" variant="secondary" className="w-full justify-center" size="lg">
          <GoogleIcon /> Continuar con Google
        </Button>
      </form>
      <form action={signInWithFacebook}>
        <Button type="submit" variant="secondary" className="w-full justify-center" size="lg">
          <FacebookIcon /> Continuar con Facebook
        </Button>
      </form>
      <form action={signInWithApple}>
        <Button type="submit" variant="secondary" className="w-full justify-center" size="lg">
          <AppleIcon /> Continuar con Apple
        </Button>
      </form>
    </div>
  );
}
