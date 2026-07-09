import { Section } from '@/config/tocSections';
import { Book } from '@/config/books';
import { parseDisplayPageNumber } from './pageFormat';

export interface TocSearchResult {
  title: string;
  /** Breadcrumb of ancestor titles, e.g. "Characteristic Studies" */
  context: string;
  page: number;
  /** True for the synthetic "go to page N" result */
  isPageJump?: boolean;
}

interface IndexEntry {
  title: string;
  context: string;
  page: number;
  haystack: string; // lowercased "context title" for matching
  words: string[];
}

const indexCache = new Map<string, IndexEntry[]>();

function buildIndex(book: Book): IndexEntry[] {
  const cached = indexCache.get(book.id);
  if (cached) return cached;
  const entries: IndexEntry[] = [];
  const walk = (nodes: Section[], ancestors: string[]) => {
    for (const node of nodes) {
      const context = ancestors.join(' › ');
      const haystack = `${context} ${node.title}`.toLowerCase();
      entries.push({
        title: node.title,
        context,
        page: node.page,
        haystack,
        words: haystack.split(/[^a-z0-9#]+/).filter(Boolean),
      });
      if (node.subsections) {
        walk(node.subsections, [...ancestors, node.title]);
      }
    }
  };
  walk(book.sections, []);
  indexCache.set(book.id, entries);
  return entries;
}

/**
 * Search a book's table of contents. Matches every whitespace-separated token
 * as a substring of the entry's "ancestors + title" text; numeric tokens rank
 * exact matches (e.g. "2" -> "#2") above substring hits (e.g. "#12").
 * A query that parses as a page number (Arabic or Roman) also returns a
 * direct "go to page" result.
 */
export function searchToc(query: string, book: Book, limit = 20): TocSearchResult[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  const results: TocSearchResult[] = [];

  const asPage = parseDisplayPageNumber(trimmed, book.pageOffset);
  if (asPage !== null && asPage >= -book.pageOffset && asPage <= book.totalPages) {
    results.push({ title: `Go to page ${query.trim()}`, context: '', page: asPage, isPageJump: true });
  }

  const tokens = trimmed.split(/\s+/).filter(Boolean);
  if (tokens.length > 0) {
    const scored: { entry: IndexEntry; score: number }[] = [];
    for (const entry of buildIndex(book)) {
      let score = 0;
      let matched = true;
      for (const token of tokens) {
        if (!entry.haystack.includes(token)) {
          matched = false;
          break;
        }
        // Prefer whole-word matches; treat "2" and "#2" as exact
        if (entry.words.includes(token) || entry.words.includes(`#${token}`)) {
          score += 2;
        } else if (entry.words.some(w => w.startsWith(token))) {
          score += 1;
        }
      }
      if (matched) scored.push({ entry, score });
    }
    scored.sort((a, b) => b.score - a.score || a.entry.page - b.entry.page);
    for (const { entry } of scored.slice(0, limit)) {
      results.push({ title: entry.title, context: entry.context, page: entry.page });
    }
  }

  return results.slice(0, limit);
}
