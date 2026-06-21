import { NextResponse } from 'next/server';
import type { EmailOtpType } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';
import { dashboardPathForProfile, validateSafeRedirect } from '@/lib/auth/redirects';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const tokenHash = searchParams.get('token_hash');
  const type = searchParams.get('type') as EmailOtpType | null;
  const next = validateSafeRedirect(searchParams.get('next'), '');

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash });
    if (!error) {
      let dest = next;
      if (!dest) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        const { data: profile } = user
          ? await supabase.from('profiles').select('*').eq('id', user.id).single()
          : { data: null };
        dest = dashboardPathForProfile(profile);
      }
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }

  return NextResponse.redirect(`${origin}/auth/auth-code-error`);
}
