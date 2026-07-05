'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Calendar from '@/components/Calendar';
import {
  getCombinedHistory,
  getDatesWithHistory,
  getPagesForDate,
  getPageCountForDate,
  formatDate,
  formatTime,
  clearAllHistory,
  PageHistoryEntry,
} from '@/utils/pageHistory';
import { formatDisplayPageNumber } from '@/utils/pageFormat';
import { appConfig } from '@/config/app.config';

export default function HistoryPage() {
  const router = useRouter();
  const [allHistory, setAllHistory] = useState<PageHistoryEntry[]>([]);
  const [datesWithHistory, setDatesWithHistory] = useState<string[]>([]);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [pagesForSelectedDate, setPagesForSelectedDate] = useState<PageHistoryEntry[]>([]);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load combined history from both localStorage and database
  useEffect(() => {
    async function loadHistory() {
      setIsLoading(true);
      try {
        const history = await getCombinedHistory();
        setAllHistory(history);
        const dates = getDatesWithHistory(history);
        setDatesWithHistory(dates);

        // Auto-select the most recent date
        if (dates.length > 0 && !selectedDate) {
          setSelectedDate(dates[0]);
        }
      } catch (error) {
        console.error('Failed to load history:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadHistory();
  }, [selectedDate]);

  // Load pages for selected date
  useEffect(() => {
    if (selectedDate && allHistory.length > 0) {
      const pages = getPagesForDate(selectedDate, allHistory);
      setPagesForSelectedDate(pages);
    } else {
      setPagesForSelectedDate([]);
    }
  }, [selectedDate, allHistory]);

  // Navigate to a page
  const handlePageClick = (page: number) => {
    // Navigate to home page with the page number as a query parameter
    router.push(`/?page=${page}`);
  };

  // Clear all history
  const handleClearHistory = async () => {
    try {
      await clearAllHistory();
      setAllHistory([]);
      setDatesWithHistory([]);
      setSelectedDate(null);
      setPagesForSelectedDate([]);
      setShowClearConfirm(false);
    } catch (error) {
      console.error('Failed to clear history:', error);
      alert('Failed to clear history. Please try again.');
    }
  };

  // Get thumbnail URL for a page (same URL scheme as ImageViewer)
  const getThumbnailUrl = (page: number): string => {
    const adjustedPage = (page + appConfig.pageOffset).toString().padStart(3, '0');
    if (appConfig.useImageProxy) {
      return `/api/image/${adjustedPage}`;
    }
    return `${appConfig.imageBaseUrl}/page-${adjustedPage}.${appConfig.imageFormat}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-blue-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push('/')}
              className="p-2 hover:bg-blue-600 rounded-lg transition"
              aria-label="Back to home"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </button>
            <h1 className="text-2xl font-bold">Page History</h1>
          </div>

          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg text-sm font-medium transition"
            disabled={datesWithHistory.length === 0}
          >
            Clear History
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto p-6">
        {isLoading ? (
          // Loading State
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
              <p className="text-gray-600 dark:text-gray-400">Loading history...</p>
            </div>
          </div>
        ) : datesWithHistory.length === 0 ? (
          // Empty State
          <div className="flex flex-col items-center justify-center py-20">
            <svg
              className="w-24 h-24 text-gray-300 dark:text-gray-600 mb-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
            <h2 className="text-2xl font-bold text-gray-700 dark:text-gray-300 mb-2">
              No History Yet
            </h2>
            <p className="text-gray-500 dark:text-gray-400 text-center max-w-md">
              Your page viewing history will appear here. Start browsing pages to build your history.
            </p>
            <button
              onClick={() => router.push('/')}
              className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition"
            >
              Start Reading
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Calendar Section */}
            <div className="lg:col-span-1">
              <Calendar
                datesWithHistory={datesWithHistory}
                selectedDate={selectedDate}
                onDateSelect={setSelectedDate}
                getPageCountForDate={(date) => getPageCountForDate(date, allHistory)}
              />
            </div>

            {/* Pages List Section */}
            <div className="lg:col-span-2">
              {selectedDate && (
                <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
                  <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">
                    {formatDate(selectedDate)}
                  </h2>

                  {pagesForSelectedDate.length === 0 ? (
                    <p className="text-gray-500 dark:text-gray-400">
                      No pages viewed on this date.
                    </p>
                  ) : (
                    <div className="space-y-4">
                      {pagesForSelectedDate.map((entry, index) => (
                        <div
                          key={`${entry.page}-${entry.timestamp}-${index}`}
                          className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition cursor-pointer"
                          onClick={() => handlePageClick(entry.page)}
                        >
                          {/* Thumbnail */}
                          <div className="flex-shrink-0 w-20 h-28 bg-gray-200 dark:bg-gray-600 rounded overflow-hidden">
                            <img
                              src={getThumbnailUrl(entry.page)}
                              alt={`Page ${formatDisplayPageNumber(entry.page, appConfig.pageOffset)}`}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                const target = e.target as HTMLImageElement;
                                target.style.display = 'none';
                              }}
                            />
                          </div>

                          {/* Page Info */}
                          <div className="flex-1">
                            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                              Page {formatDisplayPageNumber(entry.page, appConfig.pageOffset)}
                            </h3>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                              Viewed at {formatTime(entry.timestamp)}
                            </p>
                          </div>

                          {/* Arrow Icon */}
                          <div className="flex-shrink-0">
                            <svg
                              className="w-6 h-6 text-gray-400"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M9 5l7 7-7 7"
                              />
                            </svg>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              Clear All History?
            </h3>
            <p className="text-gray-600 dark:text-gray-300 mb-6">
              This will permanently delete all your page viewing history. This action cannot be undone.
            </p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleClearHistory}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
              >
                Clear History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
