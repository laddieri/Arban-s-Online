import { Section, sections as arbanSections } from './tocSections';
import { charlierSections } from './charlierSections';
import { appConfig } from './app.config';

// Compiled-in method books. Books can also be added at runtime through the
// admin UI (/admin/books): those live in the Supabase `books` table and are
// merged with this list by lib/books/server.ts (API routes) and
// lib/books/registry.ts (client). Static books here always win id clashes.
//
// To add a compiled-in book by hand:
// 1. Convert its PDF to page images and upload them to the image bucket
//    under the book's imagePrefix, 0-indexed from the first scanned page:
//    charlier/page-000.webp (cover) .. charlier/page-071.webp.
// 2. Add its TOC sections (extract titles with scripts/pdf-extract.py +
//    scripts/extract-exercise-titles.mjs).
// 3. Register it here - the viewer, search, history, and print pick it up.

export interface Book {
  id: string;
  title: string;
  shortTitle: string;
  /** Bucket path prefix for page images; '' means bucket root (legacy Arban layout) */
  imagePrefix: string;
  totalPages: number;
  /** Preface pages shown as Roman numerals; images start at page-000 */
  pageOffset: number;
  /** First "real exercise" page, used by the random-exercise button */
  minExercisePage: number;
  sections: Section[];
  /** Per-book image extension; set for books uploaded via the admin UI.
   *  Compiled-in books leave it unset and use appConfig.imageFormat. */
  imageFormat?: string;
}

export const DEFAULT_BOOK_ID = 'arban';

export const books: Book[] = [
  {
    id: 'arban',
    title: appConfig.bookTitle,
    shortTitle: "Arban's Method",
    imagePrefix: '',
    totalPages: appConfig.totalPages,
    pageOffset: appConfig.pageOffset,
    minExercisePage: 10,
    sections: arbanSections,
  },
  {
    id: 'charlier',
    title: 'Charlier — 36 Études Transcendantes',
    shortTitle: 'Charlier Études',
    imagePrefix: 'charlier',
    // 72 scanned pages (charlier/page-000.webp .. charlier/page-071.webp).
    // The book paginates continuously from the cover (étude 1 is on the
    // printed page 4), so there are no separately-numbered preface pages:
    // pageOffset -1 makes the displayed page number equal the printed page
    // number (display N -> image page-(N-1)), and the minimum page is 1.
    totalPages: 72,
    pageOffset: -1,
    minExercisePage: 4,
    sections: charlierSections,
  },
];

// A second book for exercising multi-book behavior in e2e tests.
// NEXT_PUBLIC_TEST_BOOK is only set in test builds, never in production.
if (process.env.NEXT_PUBLIC_TEST_BOOK === '1') {
  books.push({
    id: 'testbook',
    title: 'Test Book (E2E Only)',
    shortTitle: 'Test Book',
    imagePrefix: 'testbook',
    totalPages: 20,
    pageOffset: 2,
    minExercisePage: 3,
    sections: [
      { title: 'Test Section One', page: 3 },
      { title: 'Test Section Two', page: 10 },
    ],
  });
}

export function getBook(id: string | null | undefined): Book {
  return books.find(b => b.id === id) ?? books[0];
}

export function isValidBookId(id: string): boolean {
  return books.some(b => b.id === id);
}

/** Base URL for a book's images (bucket root + optional book prefix) */
export function bookImageBaseUrl(book: Book): string {
  return book.imagePrefix
    ? `${appConfig.imageBaseUrl}/${book.imagePrefix}`
    : appConfig.imageBaseUrl;
}
