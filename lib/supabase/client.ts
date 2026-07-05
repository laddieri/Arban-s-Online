import { createBrowserClient } from '@supabase/ssr';

/**
 * Create a browser Supabase client, or null when Supabase isn't configured.
 * Callers must handle null by treating the user as signed out — this keeps
 * the app usable (anonymous mode) instead of crashing on missing env vars.
 */
export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  return createBrowserClient(url, anonKey);
}
