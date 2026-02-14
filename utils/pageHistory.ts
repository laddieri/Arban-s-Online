/**
 * Page History Management Utility
 * Tracks page views with timestamps for calendar-based history navigation
 */

export interface PageHistoryEntry {
  page: number;
  timestamp: number;
  title?: string;
}

export interface GroupedHistory {
  [date: string]: PageHistoryEntry[];
}

const HISTORY_STORAGE_KEY = 'arbans_page_history';
const MAX_HISTORY_ENTRIES = 500; // Keep last 500 entries

/**
 * Add a page view to history
 */
export function addPageToHistory(page: number, title?: string): void {
  if (typeof window === 'undefined') return;

  const history = getPageHistory();

  // Add new entry
  const entry: PageHistoryEntry = {
    page,
    timestamp: Date.now(),
    title,
  };

  // Don't add duplicate consecutive entries (same page within 1 minute)
  const lastEntry = history[history.length - 1];
  if (lastEntry && lastEntry.page === page &&
      Date.now() - lastEntry.timestamp < 60000) {
    return;
  }

  history.push(entry);

  // Keep only the most recent entries
  const trimmedHistory = history.slice(-MAX_HISTORY_ENTRIES);

  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Failed to save page history:', error);
  }
}

/**
 * Get all page history entries
 */
export function getPageHistory(): PageHistoryEntry[] {
  if (typeof window === 'undefined') return [];

  try {
    const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored);
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    console.error('Failed to load page history:', error);
    return [];
  }
}

/**
 * Group history entries by date
 */
export function getHistoryByDate(): GroupedHistory {
  const history = getPageHistory();
  const grouped: GroupedHistory = {};

  history.forEach(entry => {
    const date = new Date(entry.timestamp);
    const dateKey = date.toISOString().split('T')[0]; // YYYY-MM-DD

    if (!grouped[dateKey]) {
      grouped[dateKey] = [];
    }

    grouped[dateKey].push(entry);
  });

  // Sort entries within each date by timestamp (most recent first)
  Object.keys(grouped).forEach(dateKey => {
    grouped[dateKey].sort((a, b) => b.timestamp - a.timestamp);
  });

  return grouped;
}

/**
 * Get unique pages viewed on a specific date
 */
export function getPagesForDate(dateStr: string): PageHistoryEntry[] {
  const grouped = getHistoryByDate();
  const entries = grouped[dateStr] || [];

  // Get unique pages (deduplicate by page number, keeping most recent)
  const uniquePages = new Map<number, PageHistoryEntry>();
  entries.forEach(entry => {
    if (!uniquePages.has(entry.page)) {
      uniquePages.set(entry.page, entry);
    }
  });

  return Array.from(uniquePages.values());
}

/**
 * Get dates that have history entries
 */
export function getDatesWithHistory(): string[] {
  const grouped = getHistoryByDate();
  return Object.keys(grouped).sort().reverse(); // Most recent first
}

/**
 * Get count of pages viewed on a specific date
 */
export function getPageCountForDate(dateStr: string): number {
  const pages = getPagesForDate(dateStr);
  return pages.length;
}

/**
 * Clear all history
 */
export function clearPageHistory(): void {
  if (typeof window === 'undefined') return;

  try {
    localStorage.removeItem(HISTORY_STORAGE_KEY);
  } catch (error) {
    console.error('Failed to clear page history:', error);
  }
}

/**
 * Format date for display
 */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const dateOnly = date.toISOString().split('T')[0];
  const todayOnly = today.toISOString().split('T')[0];
  const yesterdayOnly = yesterday.toISOString().split('T')[0];

  if (dateOnly === todayOnly) return 'Today';
  if (dateOnly === yesterdayOnly) return 'Yesterday';

  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format time for display
 */
export function formatTime(timestamp: number): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}
