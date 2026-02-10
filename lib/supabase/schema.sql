-- Video Submissions Table
-- Run this SQL in your Supabase SQL Editor to set up the database

CREATE TABLE IF NOT EXISTS video_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  page_number INTEGER NOT NULL,
  video_id TEXT NOT NULL,
  title TEXT NOT NULL,
  performer TEXT,
  description TEXT,
  submitted_by TEXT NOT NULL, -- email or user ID
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ,
  reviewed_by TEXT,
  rejection_reason TEXT
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_video_submissions_page ON video_submissions(page_number);
CREATE INDEX IF NOT EXISTS idx_video_submissions_status ON video_submissions(status);
CREATE INDEX IF NOT EXISTS idx_video_submissions_submitted_by ON video_submissions(submitted_by);

-- Enable Row Level Security
ALTER TABLE video_submissions ENABLE ROW LEVEL SECURITY;

-- Policy: Anyone can view approved videos
CREATE POLICY "Anyone can view approved videos"
  ON video_submissions
  FOR SELECT
  USING (status = 'approved');

-- Policy: Authenticated users can submit videos
CREATE POLICY "Authenticated users can submit videos"
  ON video_submissions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = submitted_by);

-- Policy: Users can view their own submissions
CREATE POLICY "Users can view their own submissions"
  ON video_submissions
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = submitted_by);

-- Policy: Admins can do everything (you'll need to set up admin roles)
-- For now, we'll use a simple admin table
CREATE TABLE IF NOT EXISTS admins (
  user_id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Policy: Admins can view all submissions
CREATE POLICY "Admins can view all submissions"
  ON video_submissions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()::text
    )
  );

-- Policy: Admins can update submissions
CREATE POLICY "Admins can update submissions"
  ON video_submissions
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM admins WHERE user_id = auth.uid()::text
    )
  );

-- Function to automatically set reviewed_at timestamp
CREATE OR REPLACE FUNCTION set_reviewed_at()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status != OLD.status AND NEW.status IN ('approved', 'rejected') THEN
    NEW.reviewed_at = NOW();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call the function
CREATE TRIGGER trigger_set_reviewed_at
  BEFORE UPDATE ON video_submissions
  FOR EACH ROW
  EXECUTE FUNCTION set_reviewed_at();
