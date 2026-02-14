/**
 * Page History Management Utility
 * Tracks page views with timestamps for calendar-based history navigation
 * Supports both localStorage (anonymous) and Supabase (authenticated users)
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
 * Add a page view to history (localStorage only - for anonymous users)
 * For authenticated users, use addPageToHistoryDB via API
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
 * Add a page view to the database (for authenticated users)
 */
export async function addPageToHistoryDB(page: number): Promise<void> {
  try {
    const response = await fetch('/api/history', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ page_number: page }),
    });

    if (!response.ok) {
      const data = await response.json();
      // If authentication required, fallback to localStorage
      if (response.status === 401) {
        addPageToHistory(page);
      } else {
        console.error('Failed to add to database history:', data.error);
      }
    }
  } catch (error) {
    console.error('Failed to sync history with database:', error);
    // Fallback to localStorage
    addPageToHistory(page);
  }
}

/**
 * Add a page view to history with a 30-second delay
 * Returns a cancel function to stop the delayed action if the user navigates away
 */
export function addPageToHistoryDBDelayed(page: number): () => void {
  const DELAY_MS = 30000; // 30 seconds

  const timeoutId = setTimeout(() => {
    addPageToHistoryDB(page);
  }, DELAY_MS);

  // Return a cancel function
  return () => {
    clearTimeout(timeoutId);
  };
}

/**
 * Get all page history entries from localStorage
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
 * Get all page history entries from the database (for authenticated users)
 */
export async function getPageHistoryDB(): Promise<PageHistoryEntry[]> {
  try {
    const response = await fetch('/api/history', {
      method: 'GET',
    });

    if (!response.ok) {
      // If not authenticated, return empty array
      if (response.status === 401 || response.status === 503) {
        return [];
      }
      throw new Error('Failed to fetch history from database');
    }

    const data = await response.json();

    // Convert database format to PageHistoryEntry format
    return (data.history || []).map((entry: any) => ({
      page: entry.page_number,
      timestamp: new Date(entry.viewed_at).getTime(),
    }));
  } catch (error) {
    console.error('Failed to fetch history from database:', error);
    return [];
  }
}

/**
 * Get combined history from both localStorage and database
 */
export async function getCombinedHistory(): Promise<PageHistoryEntry[]> {
  const localHistory = getPageHistory();
  const dbHistory = await getPageHistoryDB();

  // Combine and deduplicate
  const combined = [...localHistory, ...dbHistory];

  // Sort by timestamp descending
  combined.sort((a, b) => b.timestamp - a.timestamp);

  // Keep only the most recent MAX_HISTORY_ENTRIES
  return combined.slice(0, MAX_HISTORY_ENTRIES);
}

/**
 * Group history entries by date
 */
export function getHistoryByDate(history: PageHistoryEntry[] = getPageHistory()): GroupedHistory {
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
export function getPagesForDate(dateStr: string, history: PageHistoryEntry[] = getPageHistory()): PageHistoryEntry[] {
  const grouped = getHistoryByDate(history);
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
export function getDatesWithHistory(history: PageHistoryEntry[] = getPageHistory()): string[] {
  const grouped = getHistoryByDate(history);
  return Object.keys(grouped).sort().reverse(); // Most recent first
}

/**
 * Get count of unique pages viewed on a specific date
 */
export function getPageCountForDate(dateStr: string, history: PageHistoryEntry[] = getPageHistory()): number {
  const pages = getPagesForDate(dateStr, history);
  return pages.length;
}

/**
 * Clear all history from localStorage
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
 * Clear all history from database (for authenticated users)
 */
export async function clearPageHistoryDB(): Promise<void> {
  try {
    const response = await fetch('/api/history', {
      method: 'DELETE',
    });

    if (!response.ok) {
      const data = await response.json();
      throw new Error(data.error || 'Failed to clear history');
    }
  } catch (error) {
    console.error('Failed to clear database history:', error);
    throw error;
  }
}

/**
 * Clear all history (both localStorage and database)
 */
export async function clearAllHistory(): Promise<void> {
  clearPageHistory();
  try {
    await clearPageHistoryDB();
  } catch (error) {
    // If DB clear fails (e.g., not authenticated), that's okay
    console.log('Database history clear skipped:', error);
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
