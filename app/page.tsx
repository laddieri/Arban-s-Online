'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ImageViewer from '@/components/ImageViewer';
import TableOfContents from '@/components/TableOfContents';
import UserMenu from '@/components/UserMenu';
import ListsPanel from '@/components/ListsPanel';
import { appConfig } from '@/config/app.config';
import { addPageToHistoryDBDelayed } from '@/utils/pageHistory';
import { getMinPage } from '@/utils/pageFormat';

const LAST_PAGE_KEY = 'arbans_last_page';
const MIN_PAGE = getMinPage(appConfig.pageOffset);

function clampPage(page: number): number {
  return Math.min(Math.max(page, MIN_PAGE), appConfig.totalPages);
}

// iPadOS 13+ reports as macOS in the user agent; touch points distinguish it
function isIOSDevice(): boolean {
  return (
    /iPad|iPhone|iPod/.test(navigator.userAgent) ||
    (/Mac/.test(navigator.userAgent) && navigator.maxTouchPoints > 1)
  );
}

function HomeContent() {
  const searchParams = useSearchParams();
  const [currentPage, setCurrentPage] = useState(MIN_PAGE); // Start with cover page (Roman numeral i)
  const [sidebarOpen, setSidebarOpen] = useState(false); // Opened on desktop after mount; stays closed on mobile
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isListsPanelOpen, setIsListsPanelOpen] = useState(false);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const cancelHistoryTimerRef = useRef<(() => void) | null>(null);
  const restoredRef = useRef(false);

  // Navigate to a page: clamp to valid range, remember it, and keep the URL shareable
  const navigateToPage = useCallback((page: number) => {
    const clamped = clampPage(page);
    setCurrentPage(clamped);
    try {
      localStorage.setItem(LAST_PAGE_KEY, String(clamped));
    } catch {
      // localStorage unavailable (e.g. private browsing); skip persistence
    }
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(clamped));
    window.history.replaceState(null, '', url);
  }, []);

  // On load: use the ?page= URL param if present (e.g. shared links, history
  // navigation), otherwise resume from the last page read
  useEffect(() => {
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page)) {
        restoredRef.current = true;
        navigateToPage(page);
        return;
      }
    }
    if (!restoredRef.current) {
      restoredRef.current = true;
      try {
        const saved = parseInt(localStorage.getItem(LAST_PAGE_KEY) ?? '', 10);
        if (!isNaN(saved)) {
          navigateToPage(saved);
        }
      } catch {
        // localStorage unavailable; start from the cover page
      }
    }
  }, [searchParams, navigateToPage]);

  // Open the sidebar by default on desktop only; on mobile it would cover
  // the whole page, so it stays closed until the user opens it
  useEffect(() => {
    if (window.innerWidth >= 1024) {
      setSidebarOpen(true);
    }
  }, []);

  // Cleanup: cancel any pending history timer when component unmounts
  useEffect(() => {
    return () => {
      if (cancelHistoryTimerRef.current) {
        cancelHistoryTimerRef.current();
      }
    };
  }, []);

  const handlePageChange = (page: number) => {
    navigateToPage(page);

    // Cancel any pending history timer from the previous page
    if (cancelHistoryTimerRef.current) {
      cancelHistoryTimerRef.current();
    }

    // Add page to history with 30-second delay (only recorded if user stays on page)
    cancelHistoryTimerRef.current = addPageToHistoryDBDelayed(page);

    // Close sidebar on mobile when a page is selected
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Fullscreen toggle function
  const toggleFullscreen = useCallback(async () => {
    if (!mainContainerRef.current) return;

    // Check if we're on iOS/mobile Safari (fullscreen API not supported)
    const isIOS = isIOSDevice();
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
      const isIOS = isIOSDevice();
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
    const minExercisePage = 10; // Skip cover, intro, table of contents
    const maxPage = appConfig.totalPages;
    const randomPage = Math.floor(Math.random() * (maxPage - minExercisePage + 1)) + minExercisePage;
    handlePageChange(randomPage);
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
            <UserMenu onOpenLists={() => setIsListsPanelOpen(true)} />
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

export default function Home() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center h-screen bg-white dark:bg-gray-900">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    }>
      <HomeContent />
    </Suspense>
  );
}
