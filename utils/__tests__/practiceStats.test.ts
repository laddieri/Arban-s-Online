import { describe, it, expect } from 'vitest';
import { computePracticeStats } from '../practiceStats';
import { PageHistoryEntry } from '../pageHistory';

const NOW = new Date(2026, 6, 10, 12, 0); // July 10, 2026, noon local

function onDay(daysAgo: number, page = 50, hour = 10): PageHistoryEntry {
  const d = new Date(NOW);
  d.setDate(d.getDate() - daysAgo);
  d.setHours(hour, 0, 0, 0);
  return { page, timestamp: d.getTime() };
}

describe('computePracticeStats', () => {
  it('returns zeros for empty history', () => {
    const s = computePracticeStats([], NOW);
    expect(s.currentStreak).toBe(0);
    expect(s.daysLast30).toBe(0);
    expect(s.totalUniquePages).toBe(0);
    expect(s.topPages).toEqual([]);
  });

  it('counts a streak of consecutive days including today', () => {
    const s = computePracticeStats([onDay(0), onDay(1), onDay(2)], NOW);
    expect(s.currentStreak).toBe(3);
  });

  it('keeps the streak alive if today has no practice yet', () => {
    const s = computePracticeStats([onDay(1), onDay(2), onDay(3)], NOW);
    expect(s.currentStreak).toBe(3);
  });

  it('breaks the streak on a missed day', () => {
    const s = computePracticeStats([onDay(0), onDay(2), onDay(3)], NOW);
    expect(s.currentStreak).toBe(1);
  });

  it('is zero when the last practice was two or more days ago', () => {
    const s = computePracticeStats([onDay(2), onDay(3)], NOW);
    expect(s.currentStreak).toBe(0);
  });

  it('counts distinct days in the last 30 days', () => {
    const history = [onDay(0), onDay(0, 51, 15), onDay(5), onDay(29), onDay(35)];
    const s = computePracticeStats(history, NOW);
    expect(s.daysLast30).toBe(3); // day 0 counted once; day 35 outside window
  });

  it('late-evening entries count toward the local day', () => {
    // 11:30pm yesterday local: with UTC-keyed grouping (in a western timezone)
    // this would land on today and wrongly extend the streak window
    const s = computePracticeStats([onDay(1, 50, 23)], NOW);
    expect(s.currentStreak).toBe(1);
  });

  it('ranks top pages by view count', () => {
    const history = [
      onDay(0, 100), onDay(1, 100), onDay(2, 100),
      onDay(0, 200), onDay(1, 200),
      onDay(0, 300),
    ];
    const s = computePracticeStats(history, NOW);
    expect(s.totalUniquePages).toBe(3);
    expect(s.topPages).toEqual([
      { page: 100, count: 3 },
      { page: 200, count: 2 },
      { page: 300, count: 1 },
    ]);
  });

  it('limits top pages to five', () => {
    const history = [1, 2, 3, 4, 5, 6, 7].map(p => onDay(0, p));
    const s = computePracticeStats(history, NOW);
    expect(s.topPages).toHaveLength(5);
  });
});
