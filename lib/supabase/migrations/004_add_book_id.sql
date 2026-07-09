-- Multi-book support: page numbers are now scoped to a book.
-- Existing rows all belong to the original Arban's book.
-- Run this in the Supabase SQL Editor.

ALTER TABLE page_history
  ADD COLUMN IF NOT EXISTS book_id TEXT NOT NULL DEFAULT 'arban';

ALTER TABLE user_favorites
  ADD COLUMN IF NOT EXISTS book_id TEXT NOT NULL DEFAULT 'arban';

ALTER TABLE user_list_items
  ADD COLUMN IF NOT EXISTS book_id TEXT NOT NULL DEFAULT 'arban';

ALTER TABLE video_submissions
  ADD COLUMN IF NOT EXISTS book_id TEXT NOT NULL DEFAULT 'arban';

-- Uniqueness must now include the book (Arban p.5 != Charlier p.5)
ALTER TABLE user_favorites
  DROP CONSTRAINT IF EXISTS user_favorites_user_id_page_number_key;
ALTER TABLE user_favorites
  ADD CONSTRAINT user_favorites_user_book_page_key UNIQUE (user_id, book_id, page_number);

ALTER TABLE user_list_items
  DROP CONSTRAINT IF EXISTS user_list_items_list_id_page_number_key;
ALTER TABLE user_list_items
  ADD CONSTRAINT user_list_items_list_book_page_key UNIQUE (list_id, book_id, page_number);

-- Video lookups now filter by book as well as page
CREATE INDEX IF NOT EXISTS idx_video_submissions_book_page
  ON video_submissions (book_id, page_number);

CREATE INDEX IF NOT EXISTS idx_page_history_user_book
  ON page_history (user_id, book_id);
