import { books as staticBooks, Book } from '@/config/books';
import { isSupabaseConfigured } from '@/lib/supabase/api';
import { createClient } from '@/lib/supabase/server';
import type { Section } from '@/config/tocSections';

// Server-side book registry: compiled-in books merged with rows from the
// Supabase `books` table (added through the admin UI). Used by API routes;
// the browser equivalent is lib/books/registry.ts via GET /api/books.

export interface BookRow {
  id: string;
  title: string;
  short_title: string;
  image_prefix: string;
  /** Number of uploaded page images (source of truth for the page range) */
  image_count: number;
  /** Last display page: image_count - 1 - page_offset, synced on write */
  total_pages: number;
  page_offset: number;
  min_exercise_page: number;
  image_format: string;
  sections: Section[];
}

export function rowToBook(row: BookRow): Book {
  return {
    id: row.id,
    title: row.title,
    shortTitle: row.short_title,
    imagePrefix: row.image_prefix,
    totalPages: row.total_pages,
    pageOffset: row.page_offset,
    minExercisePage: row.min_exercise_page,
    imageFormat: row.image_format,
    sections: Array.isArray(row.sections) ? row.sections : [],
  };
}

export function bookToRow(book: {
  id: string;
  title: string;
  shortTitle: string;
  imageCount: number;
  totalPages: number;
  pageOffset: number;
  minExercisePage: number;
  imageFormat: string;
  sections: Section[];
}): BookRow {
  return {
    id: book.id,
    title: book.title,
    short_title: book.shortTitle,
    // Runtime books always live under a prefix matching their id
    image_prefix: book.id,
    image_count: book.imageCount,
    total_pages: book.totalPages,
    page_offset: book.pageOffset,
    min_exercise_page: book.minExercisePage,
    image_format: book.imageFormat,
    sections: book.sections,
  };
}

// Per-instance cache so the image proxy (the hottest route) doesn't hit the
// database on every request. Admin writes call invalidateBooksCache(), and
// the TTL bounds staleness across other serverless instances.
const CACHE_TTL_MS = 60_000;
let cache: { books: Book[]; expires: number } | null = null;

export function invalidateBooksCache(): void {
  cache = null;
}

export async function listBooksServer(): Promise<Book[]> {
  if (cache && Date.now() < cache.expires) return cache.books;

  let merged = [...staticBooks];
  if (isSupabaseConfigured()) {
    try {
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('books')
        .select('*')
        .order('created_at', { ascending: true });
      if (!error && data) {
        const staticIds = new Set(staticBooks.map(b => b.id));
        merged = merged.concat(
          (data as BookRow[]).filter(r => !staticIds.has(r.id)).map(rowToBook)
        );
      } else if (error) {
        // Surface why uploaded books are absent (visible in Vercel logs);
        // the compiled-in books still serve below
        console.error('Failed to load runtime books:', error.message);
      }
    } catch (err) {
      // Database unreachable: serve the compiled-in books rather than fail
      console.error('Failed to load runtime books:', err);
    }
  }

  cache = { books: merged, expires: Date.now() + CACHE_TTL_MS };
  return merged;
}

export async function isValidBookIdServer(id: string): Promise<boolean> {
  return (await getBookServer(id)) !== null;
}

/** Resolve a book id (compiled-in or runtime); null when unknown. */
export async function getBookServer(id: string | null | undefined): Promise<Book | null> {
  if (!id) return null;
  // Static ids never require a database round-trip
  const staticHit = staticBooks.find(b => b.id === id);
  if (staticHit) return staticHit;
  return (await listBooksServer()).find(b => b.id === id) ?? null;
}
