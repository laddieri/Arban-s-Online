import { describe, it, expect } from 'vitest';
import { validateBookPayload, slugFromTitle, BOOK_ID_PATTERN } from '../bookValidation';

const RESERVED = ['arban', 'charlier', 'testbook'];

const valid = {
  id: 'clarke',
  title: 'Technical Studies',
  shortTitle: 'Clarke',
  totalPages: 54,
  pageOffset: -1,
  minExercisePage: 3,
  imageFormat: 'webp',
  sections: [
    { title: 'First Study', page: 3 },
    { title: 'Second Study', page: 9, subsections: [{ title: 'Etude', page: 10 }] },
  ],
};

describe('validateBookPayload', () => {
  it('accepts a complete valid payload', () => {
    const result = validateBookPayload(valid, RESERVED);
    expect('book' in result && result.book.id).toBe('clarke');
  });

  it('fills defaults for offset, minExercisePage, format, sections', () => {
    const result = validateBookPayload(
      { id: 'clarke', title: 'T', shortTitle: 'T', totalPages: 10 },
      RESERVED
    );
    if ('error' in result) throw new Error(result.error);
    expect(result.book).toMatchObject({
      pageOffset: -1,
      minExercisePage: 1,
      imageFormat: 'webp',
      sections: [],
    });
  });

  it('rejects bad slugs and reserved ids', () => {
    for (const id of ['A', 'a', 'has space', 'Ümlaut', '-lead', 'x'.repeat(41), 'arban', 'testbook']) {
      const result = validateBookPayload({ ...valid, id }, RESERVED);
      expect('error' in result, `id "${id}" should be rejected`).toBe(true);
    }
  });

  it('rejects out-of-range geometry', () => {
    expect('error' in validateBookPayload({ ...valid, totalPages: 0 }, RESERVED)).toBe(true);
    expect('error' in validateBookPayload({ ...valid, totalPages: 2001 }, RESERVED)).toBe(true);
    expect('error' in validateBookPayload({ ...valid, pageOffset: -2 }, RESERVED)).toBe(true);
    expect('error' in validateBookPayload({ ...valid, minExercisePage: 55 }, RESERVED)).toBe(true);
    expect('error' in validateBookPayload({ ...valid, minExercisePage: 0 }, RESERVED)).toBe(true);
  });

  it('allows negative preface pages when pageOffset > 0', () => {
    const result = validateBookPayload(
      {
        ...valid,
        pageOffset: 7,
        minExercisePage: -7,
        sections: [{ title: 'Preface', page: -7 }],
      },
      RESERVED
    );
    expect('book' in result).toBe(true);
  });

  it('validates section entries', () => {
    const bad = [
      [{ title: '', page: 3 }],
      [{ title: 'x', page: 999 }],
      [{ title: 'x', page: 1.5 }],
      [{ title: 'x', page: 3, subsections: [{ title: 'y', page: 4, subsections: [{ title: 'z', page: 5 }] }] }],
      'not-an-array',
    ];
    for (const sections of bad) {
      expect('error' in validateBookPayload({ ...valid, sections }, RESERVED)).toBe(true);
    }
  });

  it('rejects unknown image formats', () => {
    expect('error' in validateBookPayload({ ...valid, imageFormat: 'gif' }, RESERVED)).toBe(true);
  });
});

describe('slugFromTitle', () => {
  it('slugifies titles into valid ids', () => {
    const cases: [string, string][] = [
      ['Clarke — Technical Studies', 'clarke-technical-studies'],
      ['36 Études Transcendantes', '36-etudes-transcendantes'],
      ['  Weird!!  Punctuation??  ', 'weird-punctuation'],
    ];
    for (const [input, expected] of cases) {
      const slug = slugFromTitle(input);
      expect(slug).toBe(expected);
      expect(BOOK_ID_PATTERN.test(slug)).toBe(true);
    }
  });
});
