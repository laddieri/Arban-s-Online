import { describe, it, expect } from 'vitest';
import { getBook } from '@/config/books';
import { titleForPage, buildVideoSearchQuery } from '../videoQuery';

const bareBook = {
  ...getBook('charlier'),
  id: 'bare',
  shortTitle: 'Bare Book',
  sections: [{ title: 'Only Entry', page: 10 }],
};

describe('titleForPage', () => {
  const charlier = getBook('charlier');

  it('returns the exact-page entry when one exists', () => {
    expect(titleForPage(charlier, 4)).toMatch(/No\. 1/);
    expect(titleForPage(charlier, 70)).toMatch(/trilles/i);
  });

  it('falls back to the closest earlier entry mid-exercise', () => {
    // Page 71 is inside étude No. 36 (starts on page 70)
    expect(titleForPage(charlier, 71)).toMatch(/No\. 36/);
  });

  it('returns null before the first entry', () => {
    expect(titleForPage(bareBook, 5)).toBeNull();
  });
});

describe('buildVideoSearchQuery', () => {
  it('combines the exercise title, a tight book keyword, and the instrument', () => {
    const charlier = getBook('charlier');
    const query = buildVideoSearchQuery(charlier, 4);
    expect(query).toContain('No. 1');
    expect(query).toContain('Charlier');
    expect(query).toContain('trumpet');
    // Generic words are stripped from the book keyword
    expect(query).not.toMatch(/Études/);
  });

  it('still produces a usable query without a TOC entry', () => {
    expect(buildVideoSearchQuery(bareBook, 5)).toBe('Bare trumpet');
  });
});
