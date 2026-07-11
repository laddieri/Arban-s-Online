'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getBook, DEFAULT_BOOK_ID } from '@/lib/books/registry';
import { useBooks } from '@/hooks/useBooks';
import { formatDisplayPageNumber } from '@/utils/pageFormat';

interface RecentVideo {
  id: string;
  videoId: string;
  title: string;
  performer: string | null;
  page: number;
  book: string;
  addedAt: string;
}

function formatAddedDate(iso: string): string {
  const date = new Date(iso);
  if (isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function RecentVideosPage() {
  const router = useRouter();
  // Subscribe to the registry so runtime-book labels resolve once loaded
  useBooks();
  const [videos, setVideos] = useState<RecentVideo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/videos/recent')
      .then(res => (res.ok ? res.json() : Promise.reject(new Error(`HTTP ${res.status}`))))
      .then(data => setVideos(data.videos ?? []))
      .catch(() => setError('Could not load recent videos. Try again in a minute.'))
      .finally(() => setIsLoading(false));
  }, []);

  const viewerUrl = (video: RecentVideo) => {
    const bookParam = video.book === DEFAULT_BOOK_ID ? '' : `book=${video.book}&`;
    return `/?${bookParam}page=${video.page}`;
  };

  // Playing a video means practicing it: open the sheet music with the
  // video overlay auto-playing (the viewer consumes the ?video= param)
  const playInViewer = (video: RecentVideo) => {
    router.push(`${viewerUrl(video)}&video=${video.videoId}`);
  };

  const pageLabel = (video: RecentVideo) => {
    const book = getBook(video.book);
    return `${book.shortTitle} - Page ${formatDisplayPageNumber(video.page, book.pageOffset)}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-blue-700 text-white p-4 shadow-lg">
        <div className="container mx-auto flex items-center gap-4">
          <button
            onClick={() => router.push('/')}
            className="p-2 hover:bg-blue-600 rounded-lg transition"
            aria-label="Back to home"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div>
            <h1 className="text-2xl font-bold">Recent Videos</h1>
            <p className="text-sm text-blue-100">
              The latest performance and demonstration videos added by the community
            </p>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-4 max-w-5xl">
        {isLoading ? (
          <div className="text-center py-16 text-gray-600 dark:text-gray-400">Loading...</div>
        ) : error ? (
          <div className="text-center py-16 text-red-600 dark:text-red-400">{error}</div>
        ) : videos.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-gray-600 dark:text-gray-400 mb-2">No videos yet.</p>
            <p className="text-sm text-gray-500 dark:text-gray-500">
              Videos submitted from an exercise page appear here once approved.
            </p>
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2" data-testid="recent-videos-grid">
            {videos.map(video => (
              <div
                key={video.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col"
              >
                <div className="aspect-video bg-black relative">
                  <button
                    onClick={() => playInViewer(video)}
                    className="group w-full h-full relative flex items-center justify-center"
                    aria-label={`Play ${video.title}`}
                    data-testid="video-facade"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={`https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`}
                      alt=""
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                    <span className="relative flex items-center justify-center w-16 h-12 rounded-xl bg-black/70 group-hover:bg-red-600 transition-colors">
                      <svg className="w-7 h-7 text-white ml-0.5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </span>
                  </button>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-1">
                  <h2 className="font-semibold text-gray-900 dark:text-gray-100 break-words">
                    {video.title}
                  </h2>
                  {video.performer && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 break-words">
                      {video.performer}
                    </p>
                  )}
                  <div className="mt-auto pt-2 flex items-center justify-between gap-2 text-sm">
                    <a href={viewerUrl(video)} className="text-blue-600 hover:underline">
                      {pageLabel(video)}
                    </a>
                    <span className="text-xs text-gray-500 dark:text-gray-500 shrink-0">
                      {formatAddedDate(video.addedAt)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
