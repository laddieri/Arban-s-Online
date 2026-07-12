'use client';

import { useState } from 'react';
import { formatDisplayPageNumber } from '@/utils/pageFormat';
import { buildVideoSearchQuery } from '@/utils/videoQuery';
import { getBook } from '@/lib/books/registry';

interface SearchResult {
  videoId: string;
  title: string;
  channel: string;
  thumbnail: string | null;
  publishedAt: string | null;
}

interface FindVideosModalProps {
  bookId: string;
  page: number;
  pageOffset: number;
  onClose: () => void;
  /** Called after a video is attached so the viewer can refresh its list */
  onAttached: () => void;
}

/**
 * Admin-only: search YouTube for performances of the exercise on the open
 * page (query pre-built from the TOC, editable) and attach picked results
 * as approved videos.
 */
export default function FindVideosModal({
  bookId,
  page,
  pageOffset,
  onClose,
  onAttached,
}: FindVideosModalProps) {
  // The suggested query is shown (and editable) before anything is sent
  // to YouTube - nothing is searched until the admin presses Search
  const [query, setQuery] = useState(() => buildVideoSearchQuery(getBook(bookId), page));
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [attached, setAttached] = useState<Set<string>>(new Set());
  const [attaching, setAttaching] = useState<string | null>(null);

  const search = async () => {
    setIsSearching(true);
    setError(null);
    try {
      const params = new URLSearchParams({ book: bookId, page: String(page), q: query });
      const res = await fetch(`/api/admin/videos/search?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Search failed');
      setQuery(data.query);
      setResults(data.results ?? []);
      setHasSearched(true);
    } catch (err: any) {
      setError(err.message || 'Search failed');
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const attach = async (result: SearchResult) => {
    setAttaching(result.videoId);
    setError(null);
    try {
      const res = await fetch('/api/admin/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          book_id: bookId,
          page_number: page,
          video_id: result.videoId,
          title: result.title,
          performer: result.channel,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to attach video');
      setAttached(prev => new Set(prev).add(result.videoId));
      onAttached();
    } catch (err: any) {
      setError(err.message || 'Failed to attach video');
    } finally {
      setAttaching(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full p-6 max-h-[85vh] flex flex-col">
        <div className="flex items-start justify-between gap-4 mb-1">
          <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
            Find videos for page {formatDisplayPageNumber(page, pageOffset)}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
          Review or edit what will be searched on YouTube, then press Search.
          Attached results are approved videos, visible to everyone right away.
        </p>

        <form
          onSubmit={e => {
            e.preventDefault();
            search();
          }}
          className="flex gap-2 mb-4"
        >
          <input
            type="text"
            value={query}
            onChange={e => setQuery(e.target.value)}
            disabled={isSearching}
            aria-label="Search query"
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
          />
          <button
            type="submit"
            disabled={isSearching}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition text-sm font-medium"
          >
            Search
          </button>
        </form>

        {error && (
          <div className="mb-3 text-sm text-red-600 dark:text-red-400" data-testid="find-videos-error">
            {error}
          </div>
        )}

        <div className="overflow-y-auto flex-1 space-y-3" data-testid="find-videos-results">
          {isSearching ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 py-8 text-center">Searching…</p>
          ) : !hasSearched && !error ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 py-8 text-center">
              Nothing has been sent to YouTube yet - adjust the search text
              above if needed, then press Search.
            </p>
          ) : results.length === 0 && !error ? (
            <p className="text-sm text-gray-600 dark:text-gray-400 py-8 text-center">
              No results. Try editing the query.
            </p>
          ) : (
            results.map(result => (
              <div
                key={result.videoId}
                className="flex gap-3 items-start p-2 rounded-lg border border-gray-200 dark:border-gray-700"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={result.thumbnail ?? `https://i.ytimg.com/vi/${result.videoId}/mqdefault.jpg`}
                  alt=""
                  className="w-32 aspect-video object-cover rounded shrink-0"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-900 dark:text-gray-100 break-words">
                    {result.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-1">{result.channel}</p>
                  <a
                    href={`https://www.youtube.com/watch?v=${result.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:underline"
                  >
                    Preview on YouTube ↗
                  </a>
                </div>
                {attached.has(result.videoId) ? (
                  <span className="shrink-0 px-3 py-1.5 text-sm text-green-700 dark:text-green-400">
                    Added ✓
                  </span>
                ) : (
                  <button
                    onClick={() => attach(result)}
                    disabled={attaching !== null}
                    className="shrink-0 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400 transition"
                  >
                    {attaching === result.videoId ? 'Adding…' : 'Attach'}
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
