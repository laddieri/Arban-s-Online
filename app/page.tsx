'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import ImageViewer from '@/components/ImageViewer';
import TableOfContents from '@/components/TableOfContents';
import UserMenu from '@/components/UserMenu';
import ListsPanel from '@/components/ListsPanel';
import { appConfig } from '@/config/app.config';

export default function Home() {
  const [currentPage, setCurrentPage] = useState(-6); // Start one page forward from cover
  const [sidebarOpen, setSidebarOpen] = useState(true); // Sidebar visible by default on desktop
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isListsPanelOpen, setIsListsPanelOpen] = useState(false);
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

    // Check if we're on iOS/mobile Safari (fullscreen API not supported)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
    const isMobile = window.innerWidth < 1024;

    // For iOS or mobile Safari, use pseudo-fullscreen (hide UI elements)
    if (isIOS || (isSafari && isMobile)) {
      setIsFullscreen(!isFullscreen);
      if (!isFullscreen) {
        setSidebarOpen(false);
      }
      return;
    }

    // For desktop browsers, use real fullscreen API
    try {
      if (!document.fullscreenElement) {
        await mainContainerRef.current.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Error toggling fullscreen:', err);
      // Fallback to pseudo-fullscreen if API fails
      setIsFullscreen(!isFullscreen);
      if (!isFullscreen) {
        setSidebarOpen(false);
      }
    }
  }, [isFullscreen]);

  // Listen for fullscreen changes (e.g., user presses Escape)
  useEffect(() => {
    const handleFullscreenChange = () => {
      // Only update state if we're actually using the fullscreen API
      // (not on iOS/mobile Safari where we use pseudo-fullscreen)
      const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      const isMobile = window.innerWidth < 1024;

      if (!isIOS && !(isSafari && isMobile)) {
        setIsFullscreen(!!document.fullscreenElement);
      }
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
          <div className="flex items-center gap-2">
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
            <button
              onClick={() => setIsListsPanelOpen(true)}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition flex items-center gap-2 whitespace-nowrap"
              title="View your lists"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                />
              </svg>
              <span className="hidden md:inline">My Lists</span>
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex flex-1 overflow-x-auto overflow-y-hidden">
        {/* Sidebar - Table of Contents */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0 lg:static' : '-translate-x-full lg:absolute'
          } fixed inset-y-0 left-0 z-30 w-80 transition-transform duration-300 ease-in-out`}
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
            sidebarOpen={sidebarOpen}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          />
        </main>

      </div>

      {/* Lists Panel */}
      <ListsPanel
        isOpen={isListsPanelOpen}
        onClose={() => setIsListsPanelOpen(false)}
        onPageSelect={handlePageChange}
        pageOffset={appConfig.pageOffset}
        baseUrl={appConfig.imageBaseUrl}
        imageFormat={appConfig.imageFormat}
        totalPages={appConfig.totalPages}
        useImageProxy={appConfig.useImageProxy}
      />
    </div>
  );
}
