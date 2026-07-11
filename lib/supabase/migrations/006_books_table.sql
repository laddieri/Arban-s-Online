-- Migration 006: runtime book registry.
--
-- Books uploaded through the admin UI live in this table; the app merges
-- them with the compiled-in books (Arban, Charlier) at runtime. Sections
-- is the TOC as JSONB: [{ "title": "...", "page": 4, "subsections": [...] }].

CREATE TABLE IF NOT EXISTS books (
  id TEXT PRIMARY KEY CHECK (id ~ '^[a-z0-9][a-z0-9-]{1,39}$'),
  title TEXT NOT NULL CHECK (char_length(title) BETWEEN 1 AND 200),
  short_title TEXT NOT NULL CHECK (char_length(short_title) BETWEEN 1 AND 60),
  image_prefix TEXT NOT NULL,
  total_pages INTEGER NOT NULL CHECK (total_pages BETWEEN 1 AND 2000),
  page_offset INTEGER NOT NULL DEFAULT -1 CHECK (page_offset BETWEEN -1 AND 100),
  min_exercise_page INTEGER NOT NULL DEFAULT 1,
  image_format TEXT NOT NULL DEFAULT 'webp' CHECK (image_format IN ('webp', 'png', 'jpg')),
  sections JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE books ENABLE ROW LEVEL SECURITY;

-- The catalog is public: anonymous readers browse books too
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
