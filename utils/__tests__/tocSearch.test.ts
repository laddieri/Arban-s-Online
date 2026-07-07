import { describe, it, expect } from 'vitest';
import { searchToc } from '../tocSearch';

const OFFSET = 7;
const TOTAL = 347;

describe('searchToc', () => {
  it('returns nothing for an empty query', () => {
    expect(searchToc('', OFFSET, TOTAL)).toEqual([]);
    expect(searchToc('   ', OFFSET, TOTAL)).toEqual([]);
  });

  it('finds sections by title words', () => {
    const results = searchToc('double tonguing', OFFSET, TOTAL);
    expect(results[0].title).toBe('Double Tonguing');
    expect(results[0].page).toBe(175);
    expect(results[0].context).toBe('Tonguing');
  });

  it('finds a characteristic study by number', () => {
    const results = searchToc('characteristic 2', OFFSET, TOTAL);
    expect(results[0].title).toBe('#2');
    expect(results[0].page).toBe(286);
    expect(results[0].context).toBe('Characteristic Studies');
    // exact "#2" outranks the substring hit "#12"
    const pages = results.map(r => r.page);
    expect(pages.indexOf(286)).toBeLessThan(pages.indexOf(296));
  });

  it('matches case-insensitively and by prefix', () => {
    const results = searchToc('CARNIVAL', OFFSET, TOTAL);
    expect(results[0].page).toBe(339);
  });

  it('offers a direct page jump for numeric queries', () => {
    const results = searchToc('50', OFFSET, TOTAL);
    expect(results[0].isPageJump).toBe(true);
    expect(results[0].page).toBe(50);
  });

  it('offers a page jump for Roman numeral preface pages', () => {
    const results = searchToc('iv', OFFSET, TOTAL);
    expect(results[0].isPageJump).toBe(true);
    expect(results[0].page).toBe(-4);
  });

  it('rejects out-of-range page jumps', () => {
    const results = searchToc('9999', OFFSET, TOTAL);
    expect(results.find(r => r.isPageJump)).toBeUndefined();
  });

  it('returns no matches for gibberish', () => {
    expect(searchToc('zzzqqq', OFFSET, TOTAL)).toEqual([]);
  });
});
