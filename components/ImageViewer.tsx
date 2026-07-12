'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { useAuthUser } from '@/hooks/useAuthUser';
import PrintDialog from './PrintDialog';
import MetronomeOverlay from './MetronomeOverlay';
import YouTubeVideosOverlay from './YouTubeVideosOverlay';
import VideoSubmissionForm from './VideoSubmissionForm';
import AddToListModal from './AddToListModal';
import AddTocEntryModal from './AddTocEntryModal';
import FindVideosModal from './FindVideosModal';
import { useIsAdmin } from '@/hooks/useIsAdmin';
import { useBooks } from '@/hooks/useBooks';
import { isRuntimeBook } from '@/lib/books/registry';
import { formatDisplayPageNumber, parseDisplayPageNumber, getMinPage } from '@/utils/pageFormat';
import { ExerciseVideo, getVideosForPage } from '@/config/exerciseVideos';

interface ImageViewerProps {
  bookId: string;
  baseUrl: string;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  imageFormat?: string;
  pageOffset?: number;
  useImageProxy?: boolean;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
  sidebarOpen?: boolean;
  onToggleSidebar?: () => void;
  /** Deep link from /videos: open the overlay on this video and start
   *  playback once the page's video list contains it */
  autoplayVideoId?: string | null;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;
const TWO_PAGE_KEY = 'arbans_two_page';

export default function ImageViewer({
  bookId,
  baseUrl,
  totalPages,
  currentPage,
  onPageChange,
  imageFormat = 'jpg',
  pageOffset = 0,
  useImageProxy = false,
  isFullscreen = false,
  onToggleFullscreen,
  sidebarOpen = false,
  onToggleSidebar,
  autoplayVideoId = null
}: ImageViewerProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  // Two-page spread view: current page + the next one side by side, like an
  // open book. Available at every screen size (a phone in landscape on a
  // music stand is a real use case); persisted in localStorage.
  const [twoPageView, setTwoPageView] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isMetronomeOpen, setIsMetronomeOpen] = useState(false);
  const [isVideosOpen, setIsVideosOpen] = useState(false);
  const [isSubmitFormOpen, setIsSubmitFormOpen] = useState(false);
  const [videos, setVideos] = useState<ExerciseVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showLeftNav, setShowLeftNav] = useState(false);
  const [showRightNav, setShowRightNav] = useState(false);
  const { user } = useAuthUser();
  const isAdmin = useIsAdmin();
  useBooks(); // subscribe so isRuntimeBook(bookId) resolves once books load
  const [isAddToListModalOpen, setIsAddToListModalOpen] = useState(false);
  const [isAddMenuOpen, setIsAddMenuOpen] = useState(false);
  const [isAddTocOpen, setIsAddTocOpen] = useState(false);
  const [isFindVideosOpen, setIsFindVideosOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const initialZoomSetRef = useRef(false);
  const savedScrollRef = useRef<{ top: number; left: number } | null>(null);
  const addMenuRef = useRef<HTMLDivElement>(null);

  // Detect desktop viewport (lg breakpoint: 1024px)
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Handle clicks outside the add menu dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (addMenuRef.current && !addMenuRef.current.contains(event.target as Node)) {
        setIsAddMenuOpen(false);
      }
    };

    if (isAddMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isAddMenuOpen]);

  // Track mouse position for edge navigation buttons (desktop only)
  useEffect(() => {
    if (!isDesktop) return;

    const EDGE_THRESHOLD = 80; // pixels from edge to trigger
    const sidebarWidth = sidebarOpen ? 320 : 0; // w-80 = 320px

    const handleMouseMove = (e: MouseEvent) => {
      const windowWidth = window.innerWidth;
      const x = e.clientX;

      // Check if near left edge (accounting for sidebar)
      setShowLeftNav(x >= sidebarWidth && x < sidebarWidth + EDGE_THRESHOLD);

      // Check if near right edge
      setShowRightNav(x > windowWidth - EDGE_THRESHOLD);
    };

    const handleMouseLeave = () => {
      setShowLeftNav(false);
      setShowRightNav(false);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [isDesktop, sidebarOpen]);

  // Keyboard navigation with arrow keys
  useEffect(() => {
    const minPageValue = getMinPage(pageOffset);

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't navigate if user is typing in an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Arrow keys move one spread at a time in two-page view
      const step = twoPageView ? 2 : 1;
      const lastVisible = twoPageView ? Math.min(currentPage + 1, totalPages) : currentPage;
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentPage > minPageValue) {
          onPageChange(Math.max(currentPage - step, minPageValue));
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (lastVisible < totalPages) {
          onPageChange(Math.min(currentPage + step, totalPages));
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pageOffset, totalPages, onPageChange, twoPageView]);

  // Reset loading state when page changes, but preserve zoom level and scroll position
  useEffect(() => {
    // Save current scroll position before loading new page
    const container = containerRef.current;
    if (container) {
      savedScrollRef.current = {
        top: container.scrollTop,
        left: container.scrollLeft
      };
    }
    setIsLoading(true);
    setImageError(false);
    // Don't reset zoom - keep the current zoom level when changing pages
  }, [currentPage]);

  // Fetch videos for current page from API and merge with config videos.
  // Rapid page changes can leave multiple requests in flight; only the
  // latest one may write state, or a slow stale response would overwrite
  // the current page's videos.
  const videosRequestRef = useRef(0);
  const refreshVideos = useCallback(async () => {
    const requestId = ++videosRequestRef.current;
    const isCurrent = () => videosRequestRef.current === requestId;
    setVideosLoading(true);
    const configVideos = bookId === 'arban' ? getVideosForPage(currentPage) : [];
    try {
      const response = await fetch(`/api/videos/${currentPage}?book=${bookId}`);
      if (!isCurrent()) return;
      if (response.ok) {
        const data = await response.json();
        if (!isCurrent()) return;
        const apiVideos: ExerciseVideo[] = data.videos || [];
        // Merge config videos with API videos, avoiding duplicates by videoId
        const apiVideoIds = new Set(apiVideos.map((v: ExerciseVideo) => v.videoId));
        const uniqueConfigVideos = configVideos.filter(v => !apiVideoIds.has(v.videoId));
        setVideos([...uniqueConfigVideos, ...apiVideos]);
      } else {
        setVideos(configVideos);
      }
    } catch (error) {
      console.error('Error fetching videos:', error);
      if (isCurrent()) setVideos(configVideos);
    } finally {
      if (isCurrent()) setVideosLoading(false);
    }
  }, [currentPage, bookId]);

  useEffect(() => {
    refreshVideos();
  }, [refreshVideos]);

  // Open the overlay for a deep-linked video, then consume the URL param
  // so later navigation and copied links don't re-trigger playback
  const autoplayOpenedRef = useRef(false);
  useEffect(() => {
    if (!autoplayVideoId || autoplayOpenedRef.current) return;
    if (videos.some(v => v.videoId === autoplayVideoId)) {
      autoplayOpenedRef.current = true;
      setIsVideosOpen(true);
      const url = new URL(window.location.href);
      url.searchParams.delete('video');
      window.history.replaceState(null, '', url);
    }
  }, [videos, autoplayVideoId]);


  // --- Zoom ---
  // All zoom changes funnel through applyZoom with an anchor point (cursor,
  // pinch midpoint, or container center) so the content under the anchor
  // stays put. The scroll correction runs in a layout effect after React has
  // committed the new content width.
  const zoomRef = useRef(zoomLevel);
  zoomRef.current = zoomLevel;
  const pendingAnchorRef = useRef<{ x: number; y: number; prevZoom: number } | null>(null);

  const applyZoom = useCallback((newZoom: number, anchor?: { x: number; y: number }) => {
    setZoomLevel(prev => {
      const clamped = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
      if (clamped !== prev && anchor) {
        pendingAnchorRef.current = { ...anchor, prevZoom: prev };
      }
      return clamped;
    });
  }, []);

  useLayoutEffect(() => {
    const anchor = pendingAnchorRef.current;
    const container = containerRef.current;
    pendingAnchorRef.current = null;
    if (!anchor || !container) return;
    const rect = container.getBoundingClientRect();
    const px = anchor.x - rect.left;
    const py = anchor.y - rect.top;
    const scale = zoomLevel / anchor.prevZoom;
    container.scrollLeft = (container.scrollLeft + px) * scale - px;
    container.scrollTop = (container.scrollTop + py) * scale - py;
  }, [zoomLevel]);

  const containerCenter = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : undefined;
  }, []);

  const zoomIn = useCallback(() => {
    applyZoom(zoomRef.current + ZOOM_STEP, containerCenter());
  }, [applyZoom, containerCenter]);

  const zoomOut = useCallback(() => {
    applyZoom(zoomRef.current - ZOOM_STEP, containerCenter());
  }, [applyZoom, containerCenter]);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  useEffect(() => {
    try {
      setTwoPageView(localStorage.getItem(TWO_PAGE_KEY) === '1');
    } catch {
      // localStorage unavailable; default to single-page view
    }
  }, []);

  const toggleTwoPageView = () => {
    const next = !twoPageView;
    setTwoPageView(next);
    // Zoom 1 fits the whole spread (or page) to the container width - the
    // natural starting point after the layout change
    setZoomLevel(1);
    const container = containerRef.current;
    if (container) {
      container.scrollTop = 0;
      container.scrollLeft = 0;
    }
    try {
      localStorage.setItem(TWO_PAGE_KEY, next ? '1' : '0');
    } catch {
      // localStorage unavailable; the toggle still works for this session
    }
  };

  // Check if image is already loaded (e.g., from cache) after mount/hydration
  useEffect(() => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setIsLoading(false);
      if (container && !initialZoomSetRef.current) {
        // Set initial zoom: 100% on mobile, 60% on desktop
        setZoomLevel(isDesktop ? 0.6 : 1);
        initialZoomSetRef.current = true;
        // Scroll down slightly from the top on desktop (simulate one scroll wheel click)
        if (isDesktop) {
          container.scrollTop = 100;
        }
        container.scrollLeft = 0;
      }
      // Restore scroll position for cached images (for page changes)
      else if (container && savedScrollRef.current) {
        container.scrollTop = savedScrollRef.current.top;
        container.scrollLeft = savedScrollRef.current.left;
      }
    }
  }, [isDesktop, currentPage]);

  // The mouse wheel zooms at the cursor, no modifier needed (trackpad pinch
  // arrives as ctrl+wheel and behaves the same); click-drag pans instead of
  // wheel-scrolling, so the viewer works like a map.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      e.preventDefault();
      // Exponential scaling keeps notched wheels (|deltaY| ~100 per click)
      // and smooth trackpads (streams of small deltas) at a comparable rate
      const factor = Math.exp(-e.deltaY * 0.0015);
      applyZoom(zoomRef.current * factor, { x: e.clientX, y: e.clientY });
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [applyZoom]);

  // Click-drag panning for mouse users. Native focus handling is left alone
  // (no preventDefault on mousedown): clicking the page must still blur the
  // page-number input so arrow keys navigate. Ghost image dragging is
  // disabled via draggable={false} on the img and select-none while panning.
  const [isPanning, setIsPanning] = useState(false);
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let drag: { x: number; y: number; left: number; top: number } | null = null;

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      if ((e.target as HTMLElement).closest('button, input, a')) return;
      drag = {
        x: e.clientX,
        y: e.clientY,
        left: container.scrollLeft,
        top: container.scrollTop,
      };
      setIsPanning(true);
    };
    const handleMouseMove = (e: MouseEvent) => {
      if (!drag) return;
      container.scrollLeft = drag.left - (e.clientX - drag.x);
      container.scrollTop = drag.top - (e.clientY - drag.y);
    };
    const handleMouseUp = () => {
      drag = null;
      setIsPanning(false);
    };

    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    return () => {
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // Two-finger pinch zoom (mobile/tablet), anchored at the pinch midpoint.
  // The container's touch-action is pan-x pan-y, so single-finger panning
  // stays native while two-finger gestures reach these handlers.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let pinch: { startDist: number; startZoom: number } | null = null;

    const touchDist = (t: TouchList) =>
      Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const touchMid = (t: TouchList) => ({
      x: (t[0].clientX + t[1].clientX) / 2,
      y: (t[0].clientY + t[1].clientY) / 2,
    });

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        pinch = { startDist: touchDist(e.touches), startZoom: zoomRef.current };
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      if (pinch && e.touches.length === 2) {
        e.preventDefault();
        const dist = touchDist(e.touches);
        if (dist > 0 && pinch.startDist > 0) {
          applyZoom(pinch.startZoom * (dist / pinch.startDist), touchMid(e.touches));
        }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
      if (e.touches.length < 2) {
        pinch = null;
      }
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: false });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('touchcancel', handleTouchEnd);
    return () => {
      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('touchcancel', handleTouchEnd);
    };
  }, [applyZoom]);

  const minPage = getMinPage(pageOffset);

  // In two-page view the right-hand page is currentPage + 1, so navigation
  // moves a whole spread at a time and "next" stops once the last page is
  // already showing on the right
  const secondPage = twoPageView && currentPage < totalPages ? currentPage + 1 : null;
  const pageStep = twoPageView ? 2 : 1;
  const canGoPrevious = currentPage > minPage;
  const canGoNext = (secondPage ?? currentPage) < totalPages;

  const goToPreviousPage = () => {
    if (canGoPrevious) {
      onPageChange(Math.max(currentPage - pageStep, minPage));
    }
  };

  const goToNextPage = () => {
    if (canGoNext) {
      onPageChange(Math.min(currentPage + pageStep, totalPages));
    }
  };

  const goToPage = (page: number) => {
    if (page >= minPage && page <= totalPages) {
      onPageChange(page);
    }
  };

  // Format page number with leading zeros (e.g., 001, 002, 003)
  const formatPageNumber = (num: number) => {
    return num.toString().padStart(3, '0');
  };

  // Construct image URL (apply offset to convert display page number to image file number)
  // When useImageProxy is true, route through /api/image/[page] to avoid firewall blocks
  const getImageUrl = (pageNum: number) => {
    const imagePageNum = pageNum + pageOffset;
    const paddedNum = formatPageNumber(imagePageNum);
    if (useImageProxy) {
      return `/api/image/${paddedNum}?book=${bookId}`;
    }
    return `${baseUrl}/page-${paddedNum}.${imageFormat}`;
  };

  const currentImageUrl = getImageUrl(currentPage);

  // Preload adjacent pages for smoother navigation (the next/previous
  // spread in two-page view)
  useEffect(() => {
    for (let offset = 1; offset <= pageStep; offset++) {
      const ahead = (twoPageView ? currentPage + 1 : currentPage) + offset;
      if (ahead <= totalPages) {
        new window.Image().src = getImageUrl(ahead);
      }
      if (currentPage - offset >= minPage) {
        new window.Image().src = getImageUrl(currentPage - offset);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, totalPages, minPage, twoPageView, pageStep]);

  return (
    <div className="relative h-full bg-white dark:bg-gray-900">
      {/* Left-side TOC toggle arrow - visible on desktop */}
      {onToggleSidebar && isDesktop && (
        <button
          onClick={onToggleSidebar}
          className={`fixed left-0 top-24 z-40 bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-r-lg shadow-lg transition-all duration-300 ${
            sidebarOpen ? 'translate-x-80' : 'translate-x-0'
          }`}
          title={sidebarOpen ? "Hide table of contents" : "Show table of contents"}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className={`h-5 w-5 transition-transform duration-300 ${sidebarOpen ? 'rotate-180' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* Edge navigation buttons - appear when mouse is near screen edges (desktop only) */}
      {isDesktop && (
        <>
          {/* Previous page - left edge */}
          <button
            onClick={goToPreviousPage}
            disabled={!canGoPrevious}
            className={`fixed top-1/2 -translate-y-1/2 z-30 h-32 w-12 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-r-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
              showLeftNav ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{ left: sidebarOpen ? '320px' : '0px' }}
            title="Previous page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Next page - right edge */}
          <button
            onClick={goToNextPage}
            disabled={!canGoNext}
            className={`fixed right-0 top-1/2 -translate-y-1/2 z-30 h-32 w-12 flex items-center justify-center bg-black/30 hover:bg-black/50 text-white rounded-l-lg transition-all duration-200 disabled:opacity-30 disabled:cursor-not-allowed ${
              showRightNav ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            title="Next page"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </>
      )}

      <div
        ref={containerRef}
        className={`h-full overflow-auto ${
          'bg-gray-100 dark:bg-gray-800'
        } pb-52 lg:pb-16 image-viewer-scroll cursor-grab ${
          isPanning ? 'cursor-grabbing select-none' : ''
        }`}
        id="image-container"
        style={{
          WebkitOverflowScrolling: 'touch',
          // pan-x pan-y keeps one-finger scrolling native but lets our
          // touch handlers own two-finger pinch (instead of browser page zoom)
          touchAction: 'pan-x pan-y',
          overscrollBehavior: 'contain'
        }}
      >
        <div
          style={{
            width: `${zoomLevel * 100}%`,
            ...(zoomLevel <= 1 ? { margin: '0 auto' } : {}),
          }}
        >
          {isLoading && !imageError && (
            <div className="absolute flex items-center justify-center inset-0">
              <div className="text-lg text-gray-600 dark:text-gray-400">Loading page {formatDisplayPageNumber(currentPage, pageOffset)}...</div>
            </div>
          )}

          {imageError ? (
            <div className="flex flex-col items-center justify-center h-96 text-center p-8">
              <div className="text-lg text-red-600 dark:text-red-400 mb-4">
                Error loading page {formatDisplayPageNumber(currentPage, pageOffset)}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Expected URL: {currentImageUrl}
              </div>
              <button
                onClick={() => {
                  setImageError(false);
                  setIsLoading(true);
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Retry
              </button>
            </div>
          ) : (
            <div className={secondPage !== null ? 'flex items-start' : undefined}>
              <img
                ref={imageRef}
                src={currentImageUrl}
                draggable={false}
                alt={`Page ${formatDisplayPageNumber(currentPage, pageOffset)} of ${totalPages}`}
                className={`h-auto transition-all duration-100 ${
                  isLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={(e) => {
                  const img = e.currentTarget;
                  setIsLoading(false);
                  const container = containerRef.current;
                  // Calculate zoom to fit entire page in viewport (only on first load)
                  if (!initialZoomSetRef.current) {
                    // Set initial zoom: 100% on mobile, 60% on desktop
                    setZoomLevel(isDesktop ? 0.6 : 1);
                    initialZoomSetRef.current = true;
                    // Scroll down slightly from the top on desktop (simulate one scroll wheel click)
                    if (container && isDesktop) {
                      container.scrollTop = 100;
                      container.scrollLeft = 0;
                    }
                  }
                  // Restore scroll position after image loads (for page changes)
                  else if (container && savedScrollRef.current) {
                    container.scrollTop = savedScrollRef.current.top;
                    container.scrollLeft = savedScrollRef.current.left;
                  }
                }}
                onError={() => {
                  setImageError(true);
                  setIsLoading(false);
                }}
                style={{
                  width: secondPage !== null ? '50%' : '100%',
                  maxWidth: 'none',
                }}
              />
              {secondPage !== null && (
                <img
                  src={getImageUrl(secondPage)}
                  draggable={false}
                  alt={`Page ${formatDisplayPageNumber(secondPage, pageOffset)} of ${totalPages}`}
                  className="h-auto transition-all duration-100"
                  style={{
                    width: '50%',
                    maxWidth: 'none',
                  }}
                />
              )}
            </div>
          )}
        </div>
      </div>

      {/* Navigation and Zoom Controls - Fixed at bottom of viewport */}
      <div className={`fixed bottom-0 left-0 right-0 ${sidebarOpen ? 'lg:left-80' : ''} bg-white dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700 p-4 lg:p-2 z-20`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 max-w-4xl mx-auto">
          {/* Page Navigation - Previous button (desktop only, shown inline) */}
          <button
            onClick={goToPreviousPage}
            disabled={!canGoPrevious}
            className="hidden lg:block px-4 py-1 bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition"
          >
            Previous
          </button>

          {/* Zoom Controls */}
          <div className="flex flex-wrap items-center justify-center gap-2 lg:gap-1 order-1 lg:order-2">
            <button
              onClick={zoomOut}
              disabled={zoomLevel <= MIN_ZOOM}
              className="px-3 py-1 lg:px-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition text-lg font-bold"
              title="Zoom out"
            >
              −
            </button>
            <input
              type="range"
              min={MIN_ZOOM}
              max={MAX_ZOOM}
              step={ZOOM_STEP}
              value={zoomLevel}
              onChange={(e) => setZoomLevel(parseFloat(e.target.value))}
              className="w-24 lg:w-20 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              title="Zoom level"
            />
            <button
              onClick={zoomIn}
              disabled={zoomLevel >= MAX_ZOOM}
              className="px-3 py-1 lg:px-2 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition text-lg font-bold"
              title="Zoom in"
            >
              +
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 w-12 text-center">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={resetZoom}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              title="Reset zoom"
            >
              Reset
            </button>
            <button
              onClick={onToggleFullscreen}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              title={isFullscreen ? "Exit fullscreen" : "Enter fullscreen"}
            >
              {isFullscreen ? (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
                </svg>
              )}
            </button>
            <button
              onClick={toggleTwoPageView}
              className={`px-2 py-1 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition ${
                twoPageView ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
              title={twoPageView ? 'Two-page view on: back to single page' : 'Two-page view: show facing pages side by side'}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </button>
            <button
              onClick={() => setIsPrintDialogOpen(true)}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              title="Print pages"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
            {isAdmin && isRuntimeBook(bookId) && (
              <button
                onClick={() => setIsAddTocOpen(true)}
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                title="Add this page to the table of contents"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m3 7v6m3-3h-6" />
                </svg>
              </button>
            )}
            {isAdmin && (
              <button
                onClick={() => setIsFindVideosOpen(true)}
                className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                title="Find videos for this page"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            )}
            <button
              onClick={() => setIsMetronomeOpen(!isMetronomeOpen)}
              className={`px-2 py-1 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition ${
                isMetronomeOpen ? 'bg-blue-500 text-white hover:bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
              }`}
              title={isMetronomeOpen ? "Close metronome" : "Open metronome"}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3" />
              </svg>
            </button>
            {videos.length > 0 && (
              <button
                onClick={() => setIsVideosOpen(!isVideosOpen)}
                className={`px-2 py-1 text-xs rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition ${
                  isVideosOpen ? 'bg-red-600 text-white hover:bg-red-700' : 'bg-gray-200 dark:bg-gray-700'
                }`}
                title={isVideosOpen ? "Close exercise videos" : `View ${videos.length} video${videos.length > 1 ? 's' : ''}`}
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                </svg>
              </button>
            )}
            {user && (
              <div className="relative" ref={addMenuRef}>
                <button
                  onClick={() => setIsAddMenuOpen(!isAddMenuOpen)}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  title="Add menu"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </button>

                {isAddMenuOpen && (
                  <div className="absolute bottom-full mb-2 right-0 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg overflow-hidden z-50 min-w-[160px]">
                    <button
                      onClick={() => {
                        setIsSubmitFormOpen(true);
                        setIsAddMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                      Add a video
                    </button>
                    <button
                      onClick={() => {
                        setIsAddToListModalOpen(true);
                        setIsAddMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700 transition flex items-center gap-2"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      Add to list
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Page indicator - desktop only, inline with controls */}
            <span className="hidden lg:inline text-sm text-gray-600 dark:text-gray-400 ml-2">
              Page{' '}
              <input
                type="text"
                value={formatDisplayPageNumber(currentPage, pageOffset)}
                onChange={(e) => {
                  const parsed = parseDisplayPageNumber(e.target.value, pageOffset);
                  if (parsed !== null) {
                    goToPage(parsed);
                  }
                }}
                className="w-14 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-800 text-sm"
              />
              {' '}/ {totalPages}
            </span>
          </div>

          {/* Page Navigation row - mobile: Prev | Page | Next, desktop: just Next button */}
          <div className="flex items-center justify-between order-2 lg:order-3">
            <button
              onClick={goToPreviousPage}
              disabled={!canGoPrevious}
              className="lg:hidden px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition"
            >
              Previous
            </button>

            <span className="text-sm lg:hidden">
              Page{' '}
              <input
                type="text"
                value={formatDisplayPageNumber(currentPage, pageOffset)}
                onChange={(e) => {
                  const parsed = parseDisplayPageNumber(e.target.value, pageOffset);
                  if (parsed !== null) {
                    goToPage(parsed);
                  }
                }}
                className="w-16 px-2 py-1 border border-gray-300 dark:border-gray-600 rounded text-center bg-white dark:bg-gray-800"
              />
              {' '}of {totalPages}
            </span>

            <button
              onClick={goToNextPage}
              disabled={!canGoNext}
              className="px-4 py-2 lg:py-1 bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition"
            >
              Next
            </button>
          </div>

          {/* Zoom hint - mobile only */}
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center lg:hidden order-3">
            Tip: Hold Ctrl/Cmd + scroll to zoom
          </p>
        </div>
      </div>

      {/* Print Dialog */}
      <PrintDialog
        isOpen={isPrintDialogOpen}
        onClose={() => setIsPrintDialogOpen(false)}
        bookId={bookId}
        currentPage={currentPage}
        totalPages={totalPages}
        baseUrl={baseUrl}
        imageFormat={imageFormat}
        pageOffset={pageOffset}
        useImageProxy={useImageProxy}
      />

      {/* Metronome Overlay */}
      <MetronomeOverlay
        isOpen={isMetronomeOpen}
        onClose={() => setIsMetronomeOpen(false)}
      />

      {/* YouTube Videos Overlay */}
      <YouTubeVideosOverlay
        isOpen={isVideosOpen}
        onClose={() => setIsVideosOpen(false)}
        videos={videos}
        initialVideoId={autoplayVideoId}
      />

      {/* Video Submission Form */}
      {isSubmitFormOpen && (
        <VideoSubmissionForm
          bookId={bookId}
          currentPage={currentPage}
          onClose={() => setIsSubmitFormOpen(false)}
          onSuccess={refreshVideos}
        />
      )}

      {/* Add to List Modal */}
      <AddToListModal
        isOpen={isAddToListModalOpen}
        onClose={() => setIsAddToListModalOpen(false)}
        bookId={bookId}
        pageNumber={currentPage}
      />

      {isAddTocOpen && (
        <AddTocEntryModal
          bookId={bookId}
          page={currentPage}
          pageOffset={pageOffset}
          onClose={() => setIsAddTocOpen(false)}
        />
      )}

      {isFindVideosOpen && (
        <FindVideosModal
          bookId={bookId}
          page={currentPage}
          pageOffset={pageOffset}
          onClose={() => setIsFindVideosOpen(false)}
          onAttached={refreshVideos}
        />
      )}
    </div>
  );
}
