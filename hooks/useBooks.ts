'use client';

import { useEffect, useSyncExternalStore } from 'react';
import {
  subscribeBooks,
  getBooksSnapshot,
  areBooksLoaded,
  loadRemoteBooks,
  Book,
} from '@/lib/books/registry';

const getStaticSnapshot = () => getBooksSnapshot();

/**
 * Reactive view of the book registry. Renders immediately with the
 * compiled-in books and re-renders once runtime books arrive.
 * isLoaded flips true after the fetch settles (success or failure).
 */
export function useBooks(): { books: Book[]; isLoaded: boolean } {
  const books = useSyncExternalStore(subscribeBooks, getBooksSnapshot, getStaticSnapshot);
  const isLoaded = useSyncExternalStore(subscribeBooks, areBooksLoaded, () => false);

  useEffect(() => {
    loadRemoteBooks();
  }, []);

  return { books, isLoaded };
}
