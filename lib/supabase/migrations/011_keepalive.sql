-- Migration 011: keep-alive write target
--
-- The keep-alive GitHub Action originally did a read-only REST query, but
-- the project got paused for "inactivity" despite green pings twice a week
-- - Supabase's pause detection evidently doesn't count a tiny read as
-- activity. A write unambiguously does. This adds a single-row table and a
-- SECURITY DEFINER function the anon key may call to stamp it.
--
-- The table itself has RLS enabled with no policies, so it is invisible
-- through the API; the only surface is the function, and all it can do is
-- update one timestamp.

CREATE TABLE IF NOT EXISTS keepalive (
  id INT PRIMARY KEY CHECK (id = 1),
  pinged_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO keepalive (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE keepalive ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.keepalive_ping()
RETURNS TIMESTAMPTZ
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE keepalive SET pinged_at = NOW() WHERE id = 1
  RETURNING pinged_at;
$$;

REVOKE ALL ON FUNCTION public.keepalive_ping() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.keepalive_ping() TO anon, authenticated;
