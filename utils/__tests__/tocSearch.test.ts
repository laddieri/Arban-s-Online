import { describe, it, expect } from 'vitest';
import { searchToc } from '../tocSearch';
import { getBook } from '@/config/books';

const ARBAN = getBook('arban');

describe('searchToc', () => {
  it('returns nothing for an empty query', () => {
    expect(searchToc('', ARBAN)).toEqual([]);
    expect(searchToc('   ', ARBAN)).toEqual([]);
  });

  it('finds sections by title words', () => {
    const results = searchToc('double tonguing', ARBAN);
    expect(results[0].title).toBe('Double Tonguing');
    expect(results[0].page).toBe(175);
    expect(results[0].context).toBe('Tonguing');
  });

  it('finds a characteristic study by number', () => {
    const results = searchToc('characteristic 2', ARBAN);
    expect(results[0].title).toBe('#2');
    expect(results[0].page).toBe(286);
    expect(results[0].context).toBe('Characteristic Studies');
    // exact "#2" outranks the substring hit "#12"
    const pages = results.map(r => r.page);
    expect(pages.indexOf(286)).toBeLessThan(pages.indexOf(296));
  });

  it('matches case-insensitively and by prefix', () => {
    const results = searchToc('CARNIVAL', ARBAN);
    expect(results[0].page).toBe(339);
  });

  it('finds melodies by title (OCR-extracted data)', () => {
    const kathleen = searchToc('kathleen', ARBAN);
    expect(kathleen[0].title).toBe('Kathleen Mavourneen');
    expect(kathleen[0].page).toBe(201);
    expect(kathleen[0].context).toContain('150 Classic and Popular Melodies');

    const carnival = searchToc('trovatore', ARBAN);
    expect(carnival.map(r => r.page)).toEqual(expect.arrayContaining([219, 221, 228]));
  });

  it('finds duets by title with duet context', () => {
    const results = searchToc('adeste fideles', ARBAN);
    expect(results[0].page).toBe(248);
    expect(results[0].context).toContain('68 Duets');
  });

  it('offers a direct page jump for numeric queries', () => {
    const results = searchToc('50', ARBAN);
    expect(results[0].isPageJump).toBe(true);
    expect(results[0].page).toBe(50);
  });

  it('offers a page jump for Roman numeral preface pages', () => {
    const results = searchToc('iv', ARBAN);
    expect(results[0].isPageJump).toBe(true);
    expect(results[0].page).toBe(-4);
  });

  it('rejects out-of-range page jumps', () => {
    const results = searchToc('9999', ARBAN);
    expect(results.find(r => r.isPageJump)).toBeUndefined();
  });

  it('returns no matches for gibberish', () => {
    expect(searchToc('zzzqqq', ARBAN)).toEqual([]);
  });
});
