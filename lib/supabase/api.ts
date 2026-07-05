import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { createClient } from './server';

type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>;

type AuthResult =
  | { supabase: SupabaseServerClient; user: User }
  | { error: NextResponse };

export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Resolve the authenticated user for an API route.
 * Returns { supabase, user } on success, or { error } holding a ready-to-return
 * NextResponse (503 when Supabase isn't configured, 401 when not signed in).
 *
 * Usage:
 *   const auth = await requireUser();
 *   if ('error' in auth) return auth.error;
 *   const { supabase, user } = auth;
 */
export async function requireUser(): Promise<AuthResult> {
  if (!isSupabaseConfigured()) {
    return {
      error: NextResponse.json(
        { error: 'Database not configured. Please contact the administrator.' },
        { status: 503 }
      ),
    };
  }

  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      error: NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      ),
    };
  }

  return { supabase, user };
}

/**
 * Like requireUser, but additionally requires the user to be in the admins
 * table (403 otherwise).
 */
export async function requireAdmin(): Promise<AuthResult> {
  const auth = await requireUser();
  if ('error' in auth) return auth;

  const { data } = await auth.supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', auth.user.id)
    .single();

  if (!data) {
    return {
      error: NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      ),
    };
  }

  return auth;
}
