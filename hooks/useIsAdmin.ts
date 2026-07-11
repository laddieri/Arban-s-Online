'use client';

import { useState, useEffect } from 'react';
import { useAuthUser } from './useAuthUser';

/**
 * Whether the signed-in user is an admin, verified server-side via
 * /api/admin/me. Only used to show/hide admin affordances - every admin
 * action is independently enforced by the API routes and RLS.
 */
export function useIsAdmin(): boolean {
  const { user } = useAuthUser();
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // No signed-in user means no admin - skip the request. Test builds
    // always probe so e2e tests can mock the endpoint (they have no
    // Supabase session to sign in with).
    if (!user && process.env.NEXT_PUBLIC_TEST_BOOK !== '1') {
      setIsAdmin(false);
      return;
    }
    let alive = true;
    fetch('/api/admin/me')
      .then(res => {
        if (alive) setIsAdmin(res.ok);
      })
      .catch(() => {
        if (alive) setIsAdmin(false);
      });
    return () => {
      alive = false;
    };
  }, [user]);

  return isAdmin;
}
