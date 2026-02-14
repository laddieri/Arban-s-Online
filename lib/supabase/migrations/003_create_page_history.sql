-- Page History Table
-- This migration creates a table for tracking page viewing history across devices

CREATE TABLE page_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  page_number INTEGER NOT NULL,
  viewed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_page_history_user_id ON page_history(user_id);
CREATE INDEX idx_page_history_page_number ON page_history(page_number);
CREATE INDEX idx_page_history_viewed_at ON page_history(viewed_at DESC);
CREATE INDEX idx_page_history_user_viewed ON page_history(user_id, viewed_at DESC);

-- Enable Row Level Security
ALTER TABLE page_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own history
CREATE POLICY "Users can view their own history"
  ON page_history
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Policy: Users can add to their own history
CREATE POLICY "Users can add to their own history"
  ON page_history
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = user_id);

-- Policy: Users can delete their own history
CREATE POLICY "Users can delete their own history"
  ON page_history
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = user_id);

-- Function to clean up old history entries (keep last 500 per user)
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

-- Optional: Create a scheduled job to run cleanup periodically
-- This would need to be set up in Supabase Dashboard -> Database -> Cron Jobs
-- Example: SELECT cron.schedule('cleanup-old-history', '0 2 * * *', 'SELECT cleanup_old_history()');
