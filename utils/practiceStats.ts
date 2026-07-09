import { PageHistoryEntry, toLocalDateKey, entryBook } from './pageHistory';

export interface PracticeStats {
  /** Consecutive practice days ending today (or yesterday, if today is still pending) */
  currentStreak: number;
  /** Distinct days with practice in the last 30 days (including today) */
  daysLast30: number;
  /** Distinct pages ever viewed */
  totalUniquePages: number;
  /** Most-viewed pages, by history entry count */
  topPages: { book: string; page: number; count: number }[];
}

export function computePracticeStats(
  history: PageHistoryEntry[],
  now: Date = new Date()
): PracticeStats {
  const dayKeys = new Set(history.map(e => toLocalDateKey(new Date(e.timestamp))));

  // Streak: walk backwards day by day. If today has no practice yet, the
  // streak isn't broken - it just counts through yesterday.
  let currentStreak = 0;
  const cursor = new Date(now);
  if (!dayKeys.has(toLocalDateKey(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
  }
  while (dayKeys.has(toLocalDateKey(cursor))) {
    currentStreak++;
    cursor.setDate(cursor.getDate() - 1);
  }

  let daysLast30 = 0;
  const day = new Date(now);
  for (let i = 0; i < 30; i++) {
    if (dayKeys.has(toLocalDateKey(day))) daysLast30++;
    day.setDate(day.getDate() - 1);
  }

  const counts = new Map<string, number>();
  for (const entry of history) {
    const key = `${entryBook(entry)}:${entry.page}`;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const topPages = [...counts.entries()]
    .map(([key, count]) => {
      const sep = key.indexOf(':');
      return { book: key.slice(0, sep), page: Number(key.slice(sep + 1)), count };
    })
    .sort((a, b) => b.count - a.count || a.page - b.page)
    .slice(0, 5);

  return {
    currentStreak,
    daysLast30,
    totalUniquePages: counts.size,
    topPages,
  };
}
