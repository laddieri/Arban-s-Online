'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ImageViewer from '@/components/ImageViewer';
import TableOfContents from '@/components/TableOfContents';
import { appConfig } from '@/config/app.config';

export default function Home() {
  const [currentPage, setCurrentPage] = useState(-7); // Start with cover page (Roman numeral i)
  const [sidebarOpen, setSidebarOpen] = useState(false); // Sidebar hidden by default
  const [isFullscreen, setIsFullscreen] = useState(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    // Close sidebar on mobile when a page is selected
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Fullscreen toggle function
  const toggleFullscreen = useCallback(async () => {
    if (!mainContainerRef.current) return;

    try {
      if (!document.fullscreenElement) {
        await mainContainerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
    }
  }, []);

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Go to a random exercise page (skip first 10 pages which are intro/contents)
  const goToRandomExercise = () => {
    const minPage = 10; // Skip cover, intro, table of contents
    const maxPage = appConfig.totalPages;
    const randomPage = Math.floor(Math.random() * (maxPage - minPage + 1)) + minPage;
    setCurrentPage(randomPage);
  };

  return (
    <div ref={mainContainerRef} className="flex flex-col h-screen h-[100dvh] overflow-hidden bg-white dark:bg-gray-900">
      {/* Header - hidden on desktop when in fullscreen */}
      <header className={`bg-blue-700 text-white p-4 shadow-lg relative z-50 flex-shrink-0 ${isFullscreen ? 'hidden' : ''}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="lg:hidden p-2 hover:bg-blue-600 rounded"
              aria-label="Toggle sidebar"
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
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
            <h1 className="text-xl md:text-2xl font-bold hidden sm:block">
              Arban's Complete Method for Trumpet/Cornet
            </h1>
            <h1 className="text-xl font-bold sm:hidden">
              Arban's Method
            </h1>
          </div>
          <button
            onClick={goToRandomExercise}
            className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition flex items-center gap-2 whitespace-nowrap"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="hidden md:inline">Give me something to practice</span>
            <span className="md:hidden">Random</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Table of Contents */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-30 w-80 transition-transform duration-300 ease-in-out lg:block`}
        >
          <TableOfContents
            onPageSelect={handlePageChange}
            currentPage={currentPage}
          />
        </aside>

        {/* Overlay for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        {/* Image Viewer */}
        <main className="flex-1 overflow-hidden">
          <ImageViewer
            baseUrl={appConfig.imageBaseUrl}
            totalPages={appConfig.totalPages}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            imageFormat={appConfig.imageFormat}
            pageOffset={appConfig.pageOffset}
            useImageProxy={appConfig.useImageProxy}
            isFullscreen={isFullscreen}
            onToggleFullscreen={toggleFullscreen}
          />
        </main>

      </div>
    </div>
  );
}
