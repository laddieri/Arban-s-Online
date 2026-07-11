'use client';

import { books as staticBooks, Book, DEFAULT_BOOK_ID } from '@/config/books';

// Client-side book registry. Starts with the compiled-in books (so first
// paint never waits on the network) and merges in runtime books from
// GET /api/books. Components subscribe via hooks/useBooks; plain functions
// (getBook, isValidBookId) read the current snapshot synchronously, keeping
// call sites as simple as they were when the registry was static.

export { DEFAULT_BOOK_ID };
export type { Book };

let current: Book[] = staticBooks;
let loaded = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach(l => l());
}

export function subscribeBooks(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getBooksSnapshot(): Book[] {
  return current;
}

/** True once the runtime list has been fetched (or definitively failed). */
export function areBooksLoaded(): boolean {
  return loaded;
}

/**
 * Fetch runtime books and merge them after the compiled-in ones.
 * Safe to call repeatedly; concurrent calls share one request.
 * force=true re-fetches (used after the admin uploads a book), busting the
 * edge cache with a throwaway query param.
 */
export function loadRemoteBooks(force = false): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (loaded && !force) return Promise.resolve();
  if (inflight) return inflight;

  const url = force ? `/api/books?t=${Date.now()}` : '/api/books';
  inflight = fetch(url)
    .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
    .then((data: { books?: Book[] }) => {
      const staticIds = new Set(staticBooks.map(b => b.id));
      const runtime = (data.books ?? []).filter(b => b && !staticIds.has(b.id));
      current = [...staticBooks, ...runtime];
    })
    .catch(() => {
      // Offline or database-less deployment: the compiled-in books stand
    })
    .finally(() => {
      loaded = true;
      inflight = null;
      emit();
    });
  return inflight;
}

/** Book for an id, falling back to the default book (matches old behavior). */
export function getBook(id: string | null | undefined): Book {
  return current.find(b => b.id === id) ?? current[0];
}

export function isValidBookId(id: string): boolean {
  return current.some(b => b.id === id);
}
