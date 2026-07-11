import type { Book } from '@/config/books';
import type { Section } from '@/config/tocSections';

// Builds YouTube search queries for a book page from its table of contents,
// e.g. page 202 of the Arban -> "Characteristic Study No. 1 Arban's trumpet".

function flatten(nodes: Section[]): { title: string; page: number }[] {
  const out: { title: string; page: number }[] = [];
  for (const node of nodes) {
    out.push({ title: node.title, page: node.page });
    if (node.subsections) out.push(...flatten(node.subsections));
  }
  return out;
}

/** The TOC title covering a page: an exact-page entry, else the closest one before it. */
export function titleForPage(book: Book, page: number): string | null {
  let best: { title: string; page: number } | null = null;
  for (const entry of flatten(book.sections)) {
    if (entry.page <= page && (best === null || entry.page >= best.page)) {
      best = entry;
    }
  }
  return best ? best.title : null;
}

// Generic words that dilute searches, dropped from the book keyword
// ("Arban's Method" -> "Arban's", "Charlier Études" -> "Charlier").
// Word-splitting instead of \b regexes: JS word boundaries are ASCII-only
// and never fire next to accented letters like the É in Études.
const GENERIC_WORDS = new Set([
  'method', 'méthode', 'études', 'etudes', 'studies', 'study', 'book',
]);

/** Default search query for a page; the admin can edit it before searching. */
export function buildVideoSearchQuery(book: Book, page: number): string {
  const title = titleForPage(book, page);
  const bookKeyword = book.shortTitle
    .split(/\s+/)
    .filter(word => !GENERIC_WORDS.has(word.toLowerCase()))
    .join(' ');
  return [title, bookKeyword, 'trumpet']
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}
