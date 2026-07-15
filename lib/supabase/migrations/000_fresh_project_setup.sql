-- =============================================================================
-- FRESH PROJECT BOOTSTRAP
-- =============================================================================
-- Creates the complete database schema at its current state in one shot.
-- Use this when setting up a brand-new Supabase project (e.g. after the old
-- one expired). Paste the whole file into the Supabase SQL Editor and run it.
--
-- Do NOT run this on an existing project - use the numbered migrations for
-- incremental upgrades instead. This file must be kept in sync with them
-- (it currently reflects schema.sql + migrations 001-011).
--
-- After running:
--   1. Add yourself as an admin (replace the values):
--        INSERT INTO admins (user_id, email)
--        VALUES ('<your auth user uuid>', 'you@example.com');
--      (Sign in to the app once first, then find your user id under
--       Authentication -> Users in the Supabase dashboard.)
--   2. Update NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in
--      your deployment environment and redeploy.
--   3. In Supabase Auth settings: add your site URL to the redirect allow
--      list, and configure custom SMTP so magic-link emails aren't rate
--      limited (2-4/hour on the built-in sender).
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Video submissions (community YouTube links, admin approved)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS video_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_number INTEGER NOT NULL,
  book_id TEXT NOT NULL DEFAULT 'arban',
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  performer TEXT,
  description TEXT,
  submitted_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  rejection_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_video_submissions_page ON video_submissions(page_number);
CREATE INDEX IF NOT EXISTS idx_video_submissions_status ON video_submissions(status);
CREATE INDEX IF NOT EXISTS idx_video_submissions_submitted_by ON video_submissions(submitted_by);
CREATE INDEX IF NOT EXISTS idx_video_submissions_book_page ON video_submissions(book_id, page_number);

ALTER TABLE video_submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view approved videos"
  ON video_submissions FOR SELECT
  USING (status = 'approved');

CREATE POLICY "Authenticated users can submit videos"
  ON video_submissions FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = submitted_by);

CREATE POLICY "Users can view their own submissions"
  ON video_submissions FOR SELECT TO authenticated
  USING (auth.uid()::text = submitted_by);

-- ---------------------------------------------------------------------------
-- Admins
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS admins (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE admins ENABLE ROW LEVEL SECURITY;

-- Users may only see their own row: enough for the app's "am I an admin?"
-- checks and for the EXISTS() subqueries in the video_submissions policies
-- below (which run as the querying user), without exposing other admins'
-- emails. Rows are inserted via the SQL editor, so no INSERT policy exists.
CREATE POLICY "Users can check their own admin status"
  ON admins FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Admins can view all submissions"
  ON video_submissions FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()::text));

CREATE POLICY "Admins can update submissions"
  ON video_submissions FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()::text));

CREATE POLICY "Admins can delete submissions"
  ON video_submissions FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()::text));

-- Automatically stamp reviewed_at when a submission is approved/rejected
CREATE OR REPLACE FUNCTION set_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    NEW.reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_reviewed_at
  BEFORE UPDATE ON video_submissions
  FOR EACH ROW
  EXECUTE FUNCTION set_reviewed_at();

-- ---------------------------------------------------------------------------
-- User favorites (legacy feature; superseded by lists but API still supports it)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_favorites (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  book_id TEXT NOT NULL DEFAULT 'arban',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_favorites_user_book_page_key UNIQUE (user_id, book_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_page_number ON user_favorites(page_number);
CREATE INDEX IF NOT EXISTS idx_user_favorites_created_at ON user_favorites(created_at DESC);

ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own favorites"
  ON user_favorites FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can add their own favorites"
  ON user_favorites FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own favorites"
  ON user_favorites FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ---------------------------------------------------------------------------
-- User lists + list items
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_lists (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_lists_user_id ON user_lists(user_id);
CREATE INDEX IF NOT EXISTS idx_user_lists_created_at ON user_lists(created_at DESC);

CREATE TABLE IF NOT EXISTS user_list_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  list_id UUID NOT NULL REFERENCES user_lists(id) ON DELETE CASCADE,
  page_number INTEGER NOT NULL,
  book_id TEXT NOT NULL DEFAULT 'arban',
  title TEXT,
  description TEXT,
  -- User-defined order within the list (the practice bar plays this order)
  position INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT user_list_items_list_book_page_key UNIQUE (list_id, book_id, page_number)
);

CREATE INDEX IF NOT EXISTS idx_user_list_items_position
  ON user_list_items(list_id, position);

CREATE INDEX IF NOT EXISTS idx_user_list_items_list_id ON user_list_items(list_id);
CREATE INDEX IF NOT EXISTS idx_user_list_items_page_number ON user_list_items(page_number);
CREATE INDEX IF NOT EXISTS idx_user_list_items_created_at ON user_list_items(created_at DESC);

ALTER TABLE user_lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_list_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own lists"
  ON user_lists FOR SELECT
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can create their own lists"
  ON user_lists FOR INSERT
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update their own lists"
  ON user_lists FOR UPDATE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own lists"
  ON user_lists FOR DELETE
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can view items in their own lists"
  ON user_list_items FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_lists
    WHERE user_lists.id = user_list_items.list_id
    AND user_lists.user_id = auth.uid()::text
  ));

CREATE POLICY "Users can add items to their own lists"
  ON user_list_items FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM user_lists
    WHERE user_lists.id = user_list_items.list_id
    AND user_lists.user_id = auth.uid()::text
  ));

CREATE POLICY "Users can update items in their own lists"
  ON user_list_items FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM user_lists
    WHERE user_lists.id = user_list_items.list_id
    AND user_lists.user_id = auth.uid()::text
  ));

CREATE POLICY "Users can delete items from their own lists"
  ON user_list_items FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM user_lists
    WHERE user_lists.id = user_list_items.list_id
    AND user_lists.user_id = auth.uid()::text
  ));

-- ---------------------------------------------------------------------------
-- Page history
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS page_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  book_id TEXT NOT NULL DEFAULT 'arban',
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_page_history_user_id ON page_history(user_id);
CREATE INDEX IF NOT EXISTS idx_page_history_page_number ON page_history(page_number);
CREATE INDEX IF NOT EXISTS idx_page_history_viewed_at ON page_history(viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_history_user_viewed ON page_history(user_id, viewed_at DESC);
CREATE INDEX IF NOT EXISTS idx_page_history_user_book ON page_history(user_id, book_id);

ALTER TABLE page_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own history"
  ON page_history FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can add to their own history"
  ON page_history FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own history"
  ON page_history FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- ---------------------------------------------------------------------------
-- Books uploaded through the admin UI (merged with compiled-in books at
-- runtime; sections is the TOC as JSONB)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  short_title TEXT NOT NULL CHECK (char_length(short_title) BETWEEN 1 AND 60),
  image_prefix TEXT NOT NULL,
  -- Number of uploaded page images (page-000 .. page-(n-1)); source of truth
  image_count INTEGER NOT NULL CHECK (image_count BETWEEN 1 AND 2000),
  -- Last display page: image_count - 1 - page_offset, maintained by the API
  total_pages INTEGER NOT NULL CHECK (total_pages BETWEEN 1 AND 2000),
  page_offset INTEGER NOT NULL DEFAULT -1 CHECK (page_offset BETWEEN -1 AND 100),
  min_exercise_page INTEGER NOT NULL DEFAULT 1,
  image_format TEXT NOT NULL DEFAULT 'webp' CHECK (image_format IN ('webp', 'png', 'jpg')),
  sections JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view books"
  ON books FOR SELECT
  USING (true);

CREATE POLICY "Admins can add books"
  ON books FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()::text));

CREATE POLICY "Admins can update books"
  ON books FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()::text));

CREATE POLICY "Admins can delete books"
  ON books FOR DELETE TO authenticated
  USING (EXISTS (SELECT 1 FROM admins WHERE user_id = auth.uid()::text));

-- ---------------------------------------------------------------------------
-- Private practice recordings (user's own YouTube links, visible only to them)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS user_videos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  book_id TEXT NOT NULL DEFAULT 'arban',
  page_number INTEGER NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_videos_user ON user_videos(user_id);
CREATE INDEX IF NOT EXISTS idx_user_videos_user_book_page
  ON user_videos(user_id, book_id, page_number);

ALTER TABLE user_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own recordings"
  ON user_videos FOR SELECT TO authenticated
  USING (auth.uid()::text = user_id);

CREATE POLICY "Users can add their own recordings"
  ON user_videos FOR INSERT TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete their own recordings"
  ON user_videos FOR DELETE TO authenticated
  USING (auth.uid()::text = user_id);

-- Keep at most the latest 500 history rows per user
CREATE OR REPLACE FUNCTION cleanup_old_history()
RETURNS void AS $$
BEGIN
  DELETE FROM page_history
  WHERE id IN (
    SELECT id FROM (
      SELECT id,
             ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY viewed_at DESC) as row_num
      FROM page_history
    ) as ranked
    WHERE row_num > 500
  );
END;
$$ LANGUAGE plpgsql;

-- ---------------------------------------------------------------------------
-- Keep-alive write target (migration 011): the keep-alive GitHub Action
-- calls keepalive_ping() so the free-tier project always registers real
-- database activity (read-only pings proved insufficient to prevent the
-- inactivity pause). RLS with no policies keeps the table API-invisible;
-- the function is the only surface and can only stamp one timestamp.
-- ---------------------------------------------------------------------------

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
