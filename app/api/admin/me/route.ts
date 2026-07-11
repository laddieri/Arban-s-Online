import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/api';

// Lightweight "am I an admin?" probe for client-side gating of admin
// affordances (e.g. the add-to-contents button in the viewer). The real
// enforcement stays in the admin routes and RLS.
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  return NextResponse.json({ admin: true });
}
