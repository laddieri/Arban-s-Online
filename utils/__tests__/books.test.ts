import { describe, it, expect } from 'vitest';
import { books, getBook, isValidBookId } from '@/config/books';
import { searchToc } from '../tocSearch';
import { getMinPage } from '../pageFormat';

// Flatten a book's TOC into leaf entries (sections with no children)
function leaves(sections: import('@/config/tocSections').Section[]): { title: string; page: number }[] {
  const out: { title: string; page: number }[] = [];
  const walk = (nodes: typeof sections) => {
    for (const n of nodes) {
      if (n.subsections?.length) walk(n.subsections);
      else out.push({ title: n.title, page: n.page });
    }
  };
  walk(sections);
  return out;
}

describe('book registry', () => {
  it('has unique ids and the default is arban', () => {
    const ids = books.map(b => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(books[0].id).toBe('arban');
    expect(isValidBookId('arban')).toBe(true);
    expect(isValidBookId('nope')).toBe(false);
  });

  it('getBook falls back to the default for unknown ids', () => {
    expect(getBook('nope').id).toBe('arban');
    expect(getBook(null).id).toBe('arban');
  });

  it('every TOC page is within each book’s valid range', () => {
    for (const book of books) {
      const min = getMinPage(book.pageOffset);
      for (const { title, page } of leaves(book.sections)) {
        expect(page, `${book.id}: "${title}" p${page} < min ${min}`).toBeGreaterThanOrEqual(min);
        expect(page, `${book.id}: "${title}" p${page} > total ${book.totalPages}`).toBeLessThanOrEqual(book.totalPages);
      }
    }
  });
});

describe('Charlier book', () => {
  const charlier = getBook('charlier');

  it('is registered with the expected geometry', () => {
    expect(charlier.id).toBe('charlier');
    expect(charlier.totalPages).toBe(72);
    expect(charlier.pageOffset).toBe(-1);
    // continuous pagination from the cover: the minimum display page is 1
    expect(getMinPage(charlier.pageOffset)).toBe(1);
  });

  it('lists all 36 études', () => {
    const etudes = leaves(charlier.sections).filter(l => /^No\. \d+/.test(l.title));
    expect(etudes).toHaveLength(36);
    // numbered 1..36 with strictly increasing pages
    const nums = etudes.map(e => parseInt(e.title.match(/No\. (\d+)/)![1], 10));
    expect(nums).toEqual(Array.from({ length: 36 }, (_, i) => i + 1));
    const pages = etudes.map(e => e.page);
    expect([...pages]).toEqual([...pages].sort((a, b) => a - b));
  });

  it('finds études by title and number', () => {
    expect(searchToc('scherzetto', charlier)[0].page).toBe(18);
    expect(searchToc('wagner', charlier)[0].page).toBe(46);
    expect(searchToc('trilles', charlier)[0].page).toBe(70);
    // étude number: "No. 14" is the one-page étude on printed page 27
    const byNumber = searchToc('14', charlier).find(r => /Pour l/.test(r.title));
    expect(byNumber?.page).toBe(27);
  });

  it('scopes search to the book (no Arban content leaks in)', () => {
    expect(searchToc('carnival', charlier)).toHaveLength(0);
    expect(searchToc('kathleen', charlier)).toHaveLength(0);
  });

  it('offers a page jump within its 72-page range only', () => {
    expect(searchToc('72', charlier)[0]).toMatchObject({ isPageJump: true, page: 72 });
    expect(searchToc('73', charlier).find(r => r.isPageJump)).toBeUndefined();
  });
});
