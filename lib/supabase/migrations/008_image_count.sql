-- Migration 008: store the true image count for runtime books and fix the
-- display-page range.
--
-- The uploader stored total_pages = the PDF's page count, but the last
-- display page maps to image file (total_pages + page_offset): for any book
-- whose page_offset isn't -1, the final (page_offset + 1) display pages
-- pointed past the real images - broken in the viewer and reported as
-- missing by the page verifier.
--
-- image_count becomes the source of truth (files page-000 .. page-(n-1));
-- total_pages now holds the correct last display page, kept in sync by the
-- admin API on every write.

ALTER TABLE books ADD COLUMN IF NOT EXISTS image_count INTEGER;

-- Every existing row was created by the old uploader, where total_pages
-- held the PDF page count = the number of uploaded images
UPDATE books SET image_count = total_pages WHERE image_count IS NULL;

-- Correct the display range (no-op for page_offset = -1 books)
UPDATE books SET total_pages = image_count - 1 - page_offset;

ALTER TABLE books
  ALTER COLUMN image_count SET NOT NULL,
  ADD CONSTRAINT books_image_count_check CHECK (image_count BETWEEN 1 AND 2000);
