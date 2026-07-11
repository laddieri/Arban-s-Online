// Pure helpers for turning per-page heading text (from the PDF text layer
// or OCR of the page's top strip) into table-of-contents suggestions.
// Kept free of browser APIs so they are unit-testable; the scanning itself
// lives in lib/tocSuggest.ts.

export interface PageHeading {
  /** Display page number (viewer numbering, offset already applied) */
  page: number;
  /** Raw heading text read from the page */
  text: string;
  /** Optional small image of the scanned strip, for the editor preview */
  preview?: string;
}

export interface TocSuggestion {
  page: number;
  title: string;
  preview?: string;
}

const MAX_TITLE_LENGTH = 120;

/** Normalize raw heading text: strip OCR junk, collapse whitespace. */
export function cleanHeadingText(raw: string): string {
  return (
    raw
      // OCR noise: keep letters (incl. accented), digits, and common
      // punctuation that appears in real titles
      .replace(/[^\p{L}\p{N} .,'’&#№—–\-()/:;!?]/gu, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      // Leading/trailing stray punctuation left behind by stripped chars
      .replace(/^[ .,'’&#—–\-()/:;!?]+/, '')
      .replace(/[ ,'&#—–\-(/:;]+$/, '')
      .slice(0, MAX_TITLE_LENGTH)
      .trim()
  );
}

/** Whether a cleaned heading looks like a real title (vs page-number junk). */
export function isPlausibleTitle(cleaned: string): boolean {
  if (cleaned.length < 4) return false;
  const letters = (cleaned.match(/\p{L}/gu) ?? []).length;
  if (letters < 3) return false; // bare page numbers, plate numbers
  // Mostly-digits strings are engraving/plate numbers, not titles
  const digits = (cleaned.match(/\p{N}/gu) ?? []).length;
  if (digits > letters) return false;
  return true;
}

function normalizeForComparison(title: string): string {
  return title.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}

/**
 * Turn per-page headings into TOC suggestions:
 * - clean and drop implausible headings
 * - drop running headers (the same text repeating across many pages,
 *   e.g. the book title printed on every page)
 */
export function buildTocSuggestions(headings: PageHeading[]): TocSuggestion[] {
  const cleaned = headings
    .map(h => ({ page: h.page, title: cleanHeadingText(h.text), preview: h.preview }))
    .filter(h => isPlausibleTitle(h.title));

  // Count normalized occurrences to spot running headers
  const counts = new Map<string, number>();
  for (const h of cleaned) {
    const key = normalizeForComparison(h.title);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const repeatLimit = Math.max(3, Math.ceil(headings.length * 0.2));

  const out: TocSuggestion[] = [];
  for (const h of cleaned) {
    if ((counts.get(normalizeForComparison(h.title)) ?? 0) >= repeatLimit) continue;
    out.push(h);
  }
  return out;
}
