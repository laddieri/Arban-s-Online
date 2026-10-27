import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/supabase/api';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const origin = requestUrl.origin;

  // Supabase redirects here with ?error=... instead of a code when the link
  // is expired or was already used (email scanners often pre-open links)
  let failed = requestUrl.searchParams.has('error');

  if (code && isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) {
      console.error('Sign-in code exchange failed:', error.message);
      failed = true;
    }
  }

  // The viewer reopens the sign-in dialog with an explanation on auth_error
  return NextResponse.redirect(failed ? `${origin}/?auth_error=1` : `${origin}/`);
}
