-- Migration 010: private practice recordings.
--
-- Users can save YouTube links of their own playing to a page without
-- submitting them for site-wide viewing: a personal practice log. Rows are
-- visible only to their owner (typically Unlisted videos on the user's own
-- channel).

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
