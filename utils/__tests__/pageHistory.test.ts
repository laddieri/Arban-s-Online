import { describe, it, expect } from 'vitest';
import {
  toLocalDateKey,
  getHistoryByDate,
  getPagesForDate,
  getDatesWithHistory,
  formatDate,
  PageHistoryEntry,
} from '../pageHistory';

// These tests are timezone-sensitive by design: the npm test script pins
// TZ=America/New_York so that a regression back to UTC-based date keys
// (toISOString) fails loudly instead of passing silently in a UTC CI runner.

function entry(page: number, date: Date): PageHistoryEntry {
  return { page, timestamp: date.getTime() };
}

describe('toLocalDateKey', () => {
  it('uses local date components, not UTC', () => {
    // 11:30pm local on July 4 — in any timezone west of UTC the UTC date
    // is already July 5, so toISOString-based keys would be wrong
    const lateEvening = new Date(2026, 6, 4, 23, 30);
    expect(toLocalDateKey(lateEvening)).toBe('2026-07-04');
    if (lateEvening.getTimezoneOffset() > 0) {
      expect(lateEvening.toISOString().split('T')[0]).not.toBe('2026-07-04');
    }
  });

  it('pads month and day', () => {
    expect(toLocalDateKey(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('getHistoryByDate', () => {
  it('groups late-evening entries under the local date', () => {
    const history = [entry(42, new Date(2026, 6, 4, 23, 30))];
    const grouped = getHistoryByDate(history);
    expect(Object.keys(grouped)).toEqual(['2026-07-04']);
  });

  it('sorts entries within a date most-recent first', () => {
    const history = [
      entry(1, new Date(2026, 6, 4, 9, 0)),
      entry(2, new Date(2026, 6, 4, 17, 0)),
    ];
    const grouped = getHistoryByDate(history);
    expect(grouped['2026-07-04'].map(e => e.page)).toEqual([2, 1]);
  });
});

describe('getPagesForDate', () => {
  it('deduplicates by page, keeping the most recent view', () => {
    const history = [
      entry(42, new Date(2026, 6, 4, 9, 0)),
      entry(42, new Date(2026, 6, 4, 17, 0)),
      entry(7, new Date(2026, 6, 4, 12, 0)),
    ];
    const pages = getPagesForDate('2026-07-04', history);
    expect(pages.map(p => p.page).sort((a, b) => a - b)).toEqual([7, 42]);
    const page42 = pages.find(p => p.page === 42)!;
    expect(new Date(page42.timestamp).getHours()).toBe(17);
  });

  it('returns empty array for a date with no history', () => {
    expect(getPagesForDate('2026-01-01', [])).toEqual([]);
  });
});

describe('getDatesWithHistory', () => {
  it('returns dates most recent first', () => {
    const history = [
      entry(1, new Date(2026, 6, 1, 12, 0)),
      entry(2, new Date(2026, 6, 3, 12, 0)),
      entry(3, new Date(2026, 6, 2, 12, 0)),
    ];
    expect(getDatesWithHistory(history)).toEqual([
      '2026-07-03',
      '2026-07-02',
      '2026-07-01',
    ]);
  });
});

describe('formatDate', () => {
  it('labels the current local date as Today', () => {
    expect(formatDate(toLocalDateKey(new Date()))).toBe('Today');
  });

  it('labels the previous local date as Yesterday', () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    expect(formatDate(toLocalDateKey(yesterday))).toBe('Yesterday');
  });

  it('spells out older dates', () => {
    expect(formatDate('2020-03-15')).toBe('Sunday, March 15, 2020');
  });
});
