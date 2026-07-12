'use client';

import { useState, useEffect, useRef, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ImageViewer from '@/components/ImageViewer';
import TableOfContents from '@/components/TableOfContents';
import UserMenu from '@/components/UserMenu';
import ListsPanel from '@/components/ListsPanel';
import PracticeBar, { PracticeSession } from '@/components/PracticeBar';
import { appConfig } from '@/config/app.config';
import { addPageToHistoryDBDelayed } from '@/utils/pageHistory';
import { getMinPage } from '@/utils/pageFormat';
import { bookImageBaseUrl, type Book } from '@/config/books';
import { getBook, isValidBookId, DEFAULT_BOOK_ID } from '@/lib/books/registry';
import { useBooks } from '@/hooks/useBooks';

// The default book keeps the legacy key so existing readers resume correctly
const lastPageKey = (bookId: string) =>
  bookId === DEFAULT_BOOK_ID ? 'arbans_last_page' : `arbans_last_page:${bookId}`;

function clampPage(page: number, book: Book): number {
  return Math.min(Math.max(page, getMinPage(book.pageOffset)), book.totalPages);
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
  const [bookId, setBookId] = useState(DEFAULT_BOOK_ID);
  const book = getBook(bookId);
  const [currentPage, setCurrentPage] = useState(() => getMinPage(getBook(DEFAULT_BOOK_ID).pageOffset)); // cover page (Roman numeral i)
  const [sidebarOpen, setSidebarOpen] = useState(false); // Opened on desktop after mount; stays closed on mobile
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isListsPanelOpen, setIsListsPanelOpen] = useState(false);
  // Active list-practice session (survives reloads within the tab)
  const [practice, setPractice] = useState<PracticeSession | null>(null);
  const mainContainerRef = useRef<HTMLDivElement>(null);
  const cancelHistoryTimerRef = useRef<(() => void) | null>(null);
  const restoredRef = useRef(false);

  // Navigate to a book/page: clamp to the book's range, remember the position,
  // and keep the URL shareable (?book= is omitted for the default book so all
  // pre-multi-book links keep working)
  const navigateTo = useCallback((targetBookId: string, page: number) => {
    const targetBook = getBook(targetBookId);
    const clamped = clampPage(page, targetBook);
    setBookId(targetBook.id);
    setCurrentPage(clamped);
    try {
      localStorage.setItem(lastPageKey(targetBook.id), String(clamped));
    } catch {
      // localStorage unavailable (e.g. private browsing); skip persistence
    }
    const url = new URL(window.location.href);
    if (targetBook.id === DEFAULT_BOOK_ID) {
      url.searchParams.delete('book');
    } else {
      url.searchParams.set('book', targetBook.id);
    }
    url.searchParams.set('page', String(clamped));
    window.history.replaceState(null, '', url);
  }, []);

  // Last page read in a book, or its cover if never opened
  const resumePageFor = (targetBookId: string): number => {
    try {
      const saved = parseInt(localStorage.getItem(lastPageKey(targetBookId)) ?? '', 10);
      if (!isNaN(saved)) return saved;
    } catch {
      // localStorage unavailable; fall through to the cover page
    }
    return getMinPage(getBook(targetBookId).pageOffset);
  };

  // Runtime books (added via the admin UI) merge into the registry shortly
  // after mount; booksLoaded gates deep-link resolution for their ids
  const { isLoaded: booksLoaded } = useBooks();

  // On load: use the ?book=/?page= URL params if present (shared links,
  // history navigation), otherwise resume from the last page read
  useEffect(() => {
    const bookParam = searchParams.get('book');
    // A ?book= id we don't recognize yet may be a runtime book still being
    // fetched - wait for the registry before falling back to the default,
    // so deep links to uploaded books resolve instead of being rewritten
    if (bookParam && !isValidBookId(bookParam) && !booksLoaded) return;
    const targetBookId = bookParam && isValidBookId(bookParam) ? bookParam : DEFAULT_BOOK_ID;
    const pageParam = searchParams.get('page');
    if (pageParam) {
      const page = parseInt(pageParam, 10);
      if (!isNaN(page)) {
        restoredRef.current = true;
        navigateTo(targetBookId, page);
        return;
      }
    }
    if (!restoredRef.current) {
      restoredRef.current = true;
      navigateTo(targetBookId, resumePageFor(targetBookId));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams, navigateTo, booksLoaded]);

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

  const handlePageChange = (page: number, targetBookId: string = bookId) => {
    navigateTo(targetBookId, page);

    // Cancel any pending history timer from the previous page
    if (cancelHistoryTimerRef.current) {
      cancelHistoryTimerRef.current();
    }

    // Add page to history with 30-second delay (only recorded if user stays on page)
    cancelHistoryTimerRef.current = addPageToHistoryDBDelayed(page, targetBookId);

    // Close sidebar on mobile when a page is selected
    if (window.innerWidth < 1024) {
      setSidebarOpen(false);
    }
  };

  // Switching books resumes wherever the reader left off in that book
  const handleBookChange = (targetBookId: string) => {
    handlePageChange(resumePageFor(targetBookId), targetBookId);
  };

  // Practice sessions survive a reload within the same tab
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem('arbans_practice');
      if (saved) setPractice(JSON.parse(saved));
    } catch {
      // corrupt/unavailable session storage; start without a session
    }
  }, []);
  useEffect(() => {
    try {
      if (practice) sessionStorage.setItem('arbans_practice', JSON.stringify(practice));
      else sessionStorage.removeItem('arbans_practice');
    } catch {
      // session storage unavailable; the bar still works for this page load
    }
  }, [practice]);

  const startPractice = (session: PracticeSession) => {
    setPractice(session);
    const item = session.items[session.index];
    if (item) handlePageChange(item.page, item.book);
  };

  const jumpPractice = (index: number) => {
    if (!practice) return;
    const item = practice.items[index];
    if (!item) return;
    setPractice({ ...practice, index });
    handlePageChange(item.page, item.book);
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

  // Go to a random exercise page in the current book (skips intro/contents)
  const goToRandomExercise = () => {
    const { minExercisePage, totalPages } = book;
    const randomPage = Math.floor(Math.random() * (totalPages - minExercisePage + 1)) + minExercisePage;
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
              {book.title}
            </h1>
            <h1 className="text-xl font-bold sm:hidden">
              {book.shortTitle}
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

      {/* List practice bar */}
      {practice && !isFullscreen && (
        <PracticeBar
          session={practice}
          onJump={jumpPractice}
          onExit={() => setPractice(null)}
        />
      )}

      {/* Main Content */}
      <div className="relative flex flex-1 overflow-x-auto overflow-y-hidden">
        {/* Sidebar - Table of Contents. Positioned inside this container (not
            the viewport) so the drawer starts below the header on mobile
            instead of sliding underneath it. */}
        <aside
          className={`${
            sidebarOpen ? 'translate-x-0 lg:static' : '-translate-x-full lg:absolute'
          } absolute inset-y-0 left-0 z-30 w-80 transition-transform duration-300 ease-in-out`}
        >
          <TableOfContents
            book={book}
            onBookChange={handleBookChange}
            onPageSelect={handlePageChange}
            currentPage={currentPage}
            onOpenLists={() => setIsListsPanelOpen(true)}
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
            bookId={book.id}
            autoplayVideoId={searchParams.get('video')}
            baseUrl={bookImageBaseUrl(book)}
            totalPages={book.totalPages}
            currentPage={currentPage}
            onPageChange={handlePageChange}
            imageFormat={book.imageFormat ?? appConfig.imageFormat}
            pageOffset={book.pageOffset}
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
        onStartPractice={startPractice}
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
