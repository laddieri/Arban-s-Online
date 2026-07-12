import type { Section } from '@/config/tocSections';
import { getMinPage } from './pageFormat';

// Shared validation for runtime-added books: the admin UI uses it for
// instant feedback and the API routes re-run it server-side. Keep in sync
// with the CHECK constraints in lib/supabase/migrations/006_books_table.sql.

export const BOOK_ID_PATTERN = /^[a-z0-9][a-z0-9-]{1,39}$/;
export const IMAGE_FORMATS = ['webp', 'png', 'jpg'] as const;
export const MAX_TOTAL_PAGES = 2000;
export const MAX_SECTION_ENTRIES = 1000;

export interface RuntimeBookPayload {
  id: string;
  title: string;
  shortTitle: string;
  /** Number of uploaded page images (page-000 .. page-(n-1)) */
  imageCount: number;
  /** Last display page, derived: imageCount - 1 - pageOffset */
  totalPages: number;
  pageOffset: number;
  minExercisePage: number;
  imageFormat: (typeof IMAGE_FORMATS)[number];
  sections: Section[];
}

export function slugFromTitle(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // strip accents
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40)
    .replace(/-+$/, '');
}

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

/**
 * Validate a sections tree (max depth 2: sections with optional subsections).
 * Returns the entry count, or an error string.
 */
function validateSections(
  value: unknown,
  totalPages: number,
  minPage: number,
  depth = 0
): { count: number } | { error: string } {
  if (!Array.isArray(value)) return { error: 'sections must be an array' };
  if (depth > 1) return { error: 'sections nest at most one level deep' };
  let count = 0;
  for (const entry of value) {
    if (!isPlainObject(entry)) return { error: 'each section must be an object' };
    if (typeof entry.title !== 'string' || entry.title.trim().length === 0 || entry.title.length > 200) {
      return { error: 'each section needs a title of 1-200 characters' };
    }
    if (
      typeof entry.page !== 'number' ||
      !Number.isInteger(entry.page) ||
      entry.page < minPage ||
      entry.page > totalPages
    ) {
      return { error: `section "${entry.title}" needs a page between ${minPage} and ${totalPages}` };
    }
    count++;
    if (entry.subsections !== undefined) {
      const sub = validateSections(entry.subsections, totalPages, minPage, depth + 1);
      if ('error' in sub) return sub;
      count += sub.count;
    }
    if (count > MAX_SECTION_ENTRIES) {
      return { error: `at most ${MAX_SECTION_ENTRIES} table-of-contents entries` };
    }
  }
  return { count };
}

/**
 * Validate an untrusted create/update payload for a runtime book.
 * reservedIds are ids that may not be (re)used - the compiled-in books.
 */
export function validateBookPayload(
  input: unknown,
  reservedIds: string[]
): { book: RuntimeBookPayload } | { error: string } {
  if (!isPlainObject(input)) return { error: 'Invalid request body' };

  const id = input.id;
  if (typeof id !== 'string' || !BOOK_ID_PATTERN.test(id)) {
    return { error: 'id must be 2-40 characters: lowercase letters, digits, hyphens' };
  }
  if (reservedIds.includes(id)) {
    return { error: `"${id}" is a built-in book id` };
  }

  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (title.length === 0 || title.length > 200) {
    return { error: 'title must be 1-200 characters' };
  }

  const shortTitle = typeof input.shortTitle === 'string' ? input.shortTitle.trim() : '';
  if (shortTitle.length === 0 || shortTitle.length > 60) {
    return { error: 'shortTitle must be 1-60 characters' };
  }

  const imageCount = input.imageCount;
  if (
    typeof imageCount !== 'number' ||
    !Number.isInteger(imageCount) ||
    imageCount < 1 ||
    imageCount > MAX_TOTAL_PAGES
  ) {
    return { error: `imageCount must be an integer between 1 and ${MAX_TOTAL_PAGES}` };
  }

  const pageOffset = input.pageOffset ?? -1;
  if (
    typeof pageOffset !== 'number' ||
    !Number.isInteger(pageOffset) ||
    pageOffset < -1 ||
    pageOffset > 100
  ) {
    return { error: 'pageOffset must be an integer between -1 and 100' };
  }

  // The last display page maps to the last image file: display totalPages
  // -> image (totalPages + pageOffset) = imageCount - 1
  const totalPages = imageCount - 1 - pageOffset;
  if (totalPages < 1) {
    return {
      error: `pageOffset ${pageOffset} is too large for ${imageCount} scanned pages`,
    };
  }

  // Display pages run from minPage (negative Roman-numeral preface pages
  // when pageOffset > 0; page 1 when pageOffset is -1) up to totalPages.
  const minPage = getMinPage(pageOffset);

  const minExercisePage = input.minExercisePage ?? minPage;
  if (
    typeof minExercisePage !== 'number' ||
    !Number.isInteger(minExercisePage) ||
    minExercisePage < minPage ||
    minExercisePage > totalPages
  ) {
    return { error: `minExercisePage must be between ${minPage} and ${totalPages}` };
  }

  const imageFormat = input.imageFormat ?? 'webp';
  if (typeof imageFormat !== 'string' || !IMAGE_FORMATS.includes(imageFormat as never)) {
    return { error: `imageFormat must be one of: ${IMAGE_FORMATS.join(', ')}` };
  }

  const sections = input.sections ?? [];
  const sectionsCheck = validateSections(sections, totalPages, minPage);
  if ('error' in sectionsCheck) return { error: sectionsCheck.error };

  return {
    book: {
      id,
      title,
      shortTitle,
      imageCount,
      totalPages,
      pageOffset,
      minExercisePage,
      imageFormat: imageFormat as RuntimeBookPayload['imageFormat'],
      sections: sections as Section[],
    },
  };
}
