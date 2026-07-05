import { describe, it, expect } from 'vitest';
import {
  toRomanNumeral,
  fromRomanNumeral,
  formatDisplayPageNumber,
  parseDisplayPageNumber,
  getMinPage,
} from '../pageFormat';

describe('toRomanNumeral', () => {
  it('converts basic numbers', () => {
    expect(toRomanNumeral(1)).toBe('i');
    expect(toRomanNumeral(4)).toBe('iv');
    expect(toRomanNumeral(7)).toBe('vii');
    expect(toRomanNumeral(9)).toBe('ix');
    expect(toRomanNumeral(14)).toBe('xiv');
    expect(toRomanNumeral(40)).toBe('xl');
    expect(toRomanNumeral(1994)).toBe('mcmxciv');
  });

  it('returns empty string for zero and negatives', () => {
    expect(toRomanNumeral(0)).toBe('');
    expect(toRomanNumeral(-3)).toBe('');
  });
});

describe('fromRomanNumeral', () => {
  it('parses valid numerals case-insensitively', () => {
    expect(fromRomanNumeral('i')).toBe(1);
    expect(fromRomanNumeral('iv')).toBe(4);
    expect(fromRomanNumeral('VII')).toBe(7);
    expect(fromRomanNumeral('xiv')).toBe(14);
    expect(fromRomanNumeral(' ix ')).toBe(9);
  });

  it('rejects invalid input', () => {
    expect(fromRomanNumeral('')).toBeNull();
    expect(fromRomanNumeral('abc')).toBeNull();
    expect(fromRomanNumeral('12')).toBeNull();
  });

  it('round-trips with toRomanNumeral for 1..100', () => {
    for (let n = 1; n <= 100; n++) {
      expect(fromRomanNumeral(toRomanNumeral(n))).toBe(n);
    }
  });
});

describe('formatDisplayPageNumber', () => {
  it('shows non-negative pages as Arabic numerals', () => {
    expect(formatDisplayPageNumber(5, 7)).toBe('5');
    expect(formatDisplayPageNumber(347, 7)).toBe('347');
    expect(formatDisplayPageNumber(0, 7)).toBe('0');
  });

  it('shows negative preface pages as Roman numerals', () => {
    expect(formatDisplayPageNumber(-7, 7)).toBe('i');
    expect(formatDisplayPageNumber(-6, 7)).toBe('ii');
    expect(formatDisplayPageNumber(-1, 7)).toBe('vii');
  });
});

describe('parseDisplayPageNumber', () => {
  it('parses Arabic page numbers', () => {
    expect(parseDisplayPageNumber('50', 7)).toBe(50);
    expect(parseDisplayPageNumber(' 12 ', 7)).toBe(12);
  });

  it('parses Roman preface pages back to negative page numbers', () => {
    expect(parseDisplayPageNumber('i', 7)).toBe(-7);
    expect(parseDisplayPageNumber('vii', 7)).toBe(-1);
  });

  it('rejects Roman numerals beyond the preface range', () => {
    expect(parseDisplayPageNumber('viii', 7)).toBeNull();
  });

  it('rejects garbage', () => {
    expect(parseDisplayPageNumber('', 7)).toBeNull();
    expect(parseDisplayPageNumber('hello', 7)).toBeNull();
  });

  it('round-trips every displayable page', () => {
    for (let page = -7; page <= 347; page++) {
      const display = formatDisplayPageNumber(page, 7);
      expect(parseDisplayPageNumber(display, 7)).toBe(page);
    }
  });
});

describe('getMinPage', () => {
  it('is the negative page offset', () => {
    expect(getMinPage(7)).toBe(-7);
    // -0 === 0, which is all the comparison call sites care about
    expect(getMinPage(0) === 0).toBe(true);
  });
});
