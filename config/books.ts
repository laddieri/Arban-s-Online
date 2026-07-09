import { Section, sections as arbanSections } from './tocSections';
import { appConfig } from './app.config';

// Registry of method books available in the viewer. To add a book:
// 1. Convert its PDF to page images (scripts/convert-pdf.py) and upload them
//    to the image bucket under the book's imagePrefix
//    (e.g. charlier/page-001.webp).
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
  // Charlier "36 Etudes Transcendantes" registers here once its images are
  // uploaded under the 'charlier/' prefix and its TOC data is extracted.
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
