'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PrintDialog from './PrintDialog';
import MetronomeOverlay from './MetronomeOverlay';
import { formatDisplayPageNumber, parseDisplayPageNumber, getMinPage } from '@/utils/pageFormat';

interface ImageViewerProps {
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
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export default function ImageViewer({
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
  onToggleSidebar
}: ImageViewerProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isMetronomeOpen, setIsMetronomeOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [showLeftNav, setShowLeftNav] = useState(false);
  const [showRightNav, setShowRightNav] = useState(false);
  const [imageNaturalWidth, setImageNaturalWidth] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const initialZoomSetRef = useRef(false);
  const savedScrollRef = useRef<{ top: number; left: number } | null>(null);
  const dragStartRef = useRef<{ x: number; y: number; scrollLeft: number; scrollTop: number } | null>(null);

  // Detect desktop viewport (lg breakpoint: 1024px)
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

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

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        if (currentPage > minPageValue) {
          onPageChange(currentPage - 1);
        }
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentPage < totalPages) {
          onPageChange(currentPage + 1);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [currentPage, pageOffset, totalPages, onPageChange]);

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

  // Check if image is already loaded (e.g., from cache) after mount/hydration
  // Also calculate fit zoom on desktop for cached images (only on first load)
  useEffect(() => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setIsLoading(false);
      // On desktop, calculate zoom to fit entire page in viewport (only on first load)
      if (isDesktop && container && !initialZoomSetRef.current) {
        const containerWidth = container.clientWidth - 32;
        const bottomBarHeight = 64; // lg:pb-16 (64px) on desktop
        const verticalPadding = 16; // Only bottom padding on desktop (lg:pt-0)
        const containerHeight = container.clientHeight - verticalPadding - bottomBarHeight;
        const zoomToFitWidth = containerWidth / img.naturalWidth;
        const zoomToFitHeight = containerHeight / img.naturalHeight;
        const fitZoom = Math.min(zoomToFitWidth, zoomToFitHeight);
        setZoomLevel(Math.max(MIN_ZOOM, Math.min(fitZoom, MAX_ZOOM)));
        initialZoomSetRef.current = true;
        // Scroll to top so image sits against header
        container.scrollTop = 0;
      }
      // Restore scroll position for cached images (for page changes)
      else if (container && savedScrollRef.current) {
        container.scrollTop = savedScrollRef.current.top;
        container.scrollLeft = savedScrollRef.current.left;
      }
    }
  }, [isDesktop, currentPage]);

  // Zoom functions
  const zoomIn = useCallback(() => {
    setZoomLevel(prev => Math.min(prev + ZOOM_STEP, MAX_ZOOM));
  }, []);

  const zoomOut = useCallback(() => {
    setZoomLevel(prev => Math.max(prev - ZOOM_STEP, MIN_ZOOM));
  }, []);

  const resetZoom = useCallback(() => {
    setZoomLevel(1);
  }, []);

  // Calculate zoom level to fit entire image in viewport on desktop
  const calculateFitZoom = useCallback(() => {
    const container = containerRef.current;
    const image = imageRef.current;
    if (!container || !image || !image.naturalWidth || !image.naturalHeight) return 1;

    // Get container dimensions (account for padding and bottom control bar)
    const containerWidth = container.clientWidth - 32; // p-4 = 16px * 2
    const bottomBarHeight = isDesktop ? 64 : 160; // lg:pb-16 (64px) vs pb-40 (160px)
    // On desktop, only bottom padding (pb-4 = 16px), no top padding (lg:pt-0)
    // On mobile, both top and bottom padding (pt-4 + pb-4 = 32px)
    const verticalPadding = isDesktop ? 16 : 32;
    const containerHeight = container.clientHeight - verticalPadding - bottomBarHeight;

    // Calculate zoom to fit width and height
    const zoomToFitWidth = containerWidth / image.naturalWidth;
    const zoomToFitHeight = containerHeight / image.naturalHeight;

    // Use the smaller zoom to ensure entire image fits
    const fitZoom = Math.min(zoomToFitWidth, zoomToFitHeight);

    // Clamp to valid zoom range
    return Math.max(MIN_ZOOM, Math.min(fitZoom, MAX_ZOOM));
  }, [isDesktop]);

  // Handle mouse wheel zoom (with Ctrl/Cmd key)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
        setZoomLevel(prev => Math.min(Math.max(prev + delta, MIN_ZOOM), MAX_ZOOM));
      }
    };

    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, []);

  // Handle click-to-drag panning when zoomed in
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    // Only enable drag when zoomed in beyond 100%
    if (zoomLevel <= 1) return;

    // Don't start drag if clicking on a button or interactive element
    const target = e.target as HTMLElement;
    if (target.closest('button') || target.closest('input') || target.closest('a')) return;

    const container = containerRef.current;
    if (!container) return;

    setIsDragging(true);
    dragStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop
    };

    // Prevent text selection while dragging
    e.preventDefault();
  }, [zoomLevel]);

  // Handle drag movement and end on document level
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      const container = containerRef.current;
      const dragStart = dragStartRef.current;
      if (!container || !dragStart) return;

      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;

      container.scrollLeft = dragStart.scrollLeft - deltaX;
      container.scrollTop = dragStart.scrollTop - deltaY;
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      dragStartRef.current = null;
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging]);

  const minPage = getMinPage(pageOffset);

  const goToPreviousPage = () => {
    if (currentPage > minPage) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
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
      return `/api/image/${paddedNum}`;
    }
    return `${baseUrl}/page-${paddedNum}.${imageFormat}`;
  };

  const currentImageUrl = getImageUrl(currentPage);

  // Preload next and previous images for smoother navigation
  useEffect(() => {
    if (currentPage < totalPages) {
      const nextImage = new window.Image();
      nextImage.src = getImageUrl(currentPage + 1);
    }
    if (currentPage > minPage) {
      const prevImage = new window.Image();
      prevImage.src = getImageUrl(currentPage - 1);
    }
  }, [currentPage, totalPages, minPage]);

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
            disabled={currentPage <= minPage}
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
            disabled={currentPage >= totalPages}
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
        className={`h-full overflow-auto bg-gray-100 dark:bg-gray-800 pb-40 lg:pb-16 image-viewer-scroll ${
          zoomLevel > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
        id="image-container"
        onMouseDown={handleDragStart}
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: zoomLevel > 1 ? 'pan-x pan-y' : 'auto',
          overscrollBehavior: 'contain',
          userSelect: isDragging ? 'none' : 'auto'
        }}
      >
        <div
          className={`pb-4 pt-4 lg:pt-0 ${zoomLevel <= 1 ? 'flex justify-center items-start px-4' : ''}`}
          style={{
            ...(isDesktop ? {} : { minHeight: '100%' }),
            ...(zoomLevel > 1 && imageNaturalWidth > 0 ? {
              width: `${Math.ceil(imageNaturalWidth * zoomLevel) + 32}px`,
              paddingLeft: '16px',
              paddingRight: '16px'
            } : {})
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
            <img
              ref={imageRef}
              src={currentImageUrl}
              alt={`Page ${formatDisplayPageNumber(currentPage, pageOffset)} of ${totalPages}`}
              className={`h-auto shadow-lg transition-all duration-100 ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={(e) => {
                const img = e.currentTarget;
                setIsLoading(false);
                setImageNaturalWidth(img.naturalWidth);
                const container = containerRef.current;
                // On desktop, calculate zoom to fit entire page in viewport (only on first load)
                if (isDesktop && !initialZoomSetRef.current) {
                  const fitZoom = calculateFitZoom();
                  setZoomLevel(fitZoom);
                  initialZoomSetRef.current = true;
                  // Scroll to top so image sits against header
                  if (container) {
                    container.scrollTop = 0;
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
                width: imageNaturalWidth > 0 ? `${Math.ceil(imageNaturalWidth * zoomLevel)}px` : `${zoomLevel * 100}%`,
                maxWidth: 'none'
              }}
            />
          )}
        </div>
      </div>

      {/* Navigation and Zoom Controls - Fixed at bottom of viewport */}
      <div className={`fixed bottom-0 left-0 right-0 ${sidebarOpen ? 'lg:left-80' : ''} bg-white dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700 p-4 lg:p-2 z-20`}>
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 lg:gap-4 max-w-4xl mx-auto">
          {/* Page Navigation - Previous button (desktop only, shown inline) */}
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= minPage}
            className="hidden lg:block px-4 py-1 bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition"
          >
            Previous
          </button>

          {/* Zoom Controls */}
          <div className="flex items-center justify-center gap-2 lg:gap-1 order-1 lg:order-2">
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
              onClick={() => setIsPrintDialogOpen(true)}
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
              title="Print pages"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
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
              disabled={currentPage <= minPage}
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
              disabled={currentPage >= totalPages}
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
    </div>
  );
}
