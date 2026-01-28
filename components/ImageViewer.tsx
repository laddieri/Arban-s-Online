'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import PrintDialog from './PrintDialog';
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
  onToggleFullscreen
}: ImageViewerProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);

  // Detect desktop viewport (lg breakpoint: 1024px)
  useEffect(() => {
    const checkDesktop = () => {
      setIsDesktop(window.innerWidth >= 1024);
    };
    checkDesktop();
    window.addEventListener('resize', checkDesktop);
    return () => window.removeEventListener('resize', checkDesktop);
  }, []);

  // Reset loading state when page changes
  // Zoom will be recalculated when the image loads (fit-to-screen on desktop, 100% on mobile)
  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
    // On mobile, reset to 100% width; on desktop, zoom will be set when image loads
    if (!isDesktop) {
      setZoomLevel(1);
    }
  }, [currentPage, isDesktop]);

  // Check if image is already loaded (e.g., from cache) after mount/hydration
  // Also calculate fit zoom on desktop for cached images
  useEffect(() => {
    const img = imageRef.current;
    const container = containerRef.current;
    if (img && img.complete && img.naturalWidth > 0) {
      setIsLoading(false);
      // On desktop, calculate zoom to fit entire page in viewport
      if (isDesktop && container) {
        const containerWidth = container.clientWidth - 32;
        const containerHeight = container.clientHeight - 32 - 160;
        const zoomToFitWidth = containerWidth / img.naturalWidth;
        const zoomToFitHeight = containerHeight / img.naturalHeight;
        const fitZoom = Math.min(zoomToFitWidth, zoomToFitHeight);
        setZoomLevel(Math.max(MIN_ZOOM, Math.min(fitZoom, MAX_ZOOM)));
      }
    }
  });

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
    const containerHeight = container.clientHeight - 32 - 160; // p-4 + pb-40 (bottom bar space)

    // Calculate zoom to fit width and height
    const zoomToFitWidth = containerWidth / image.naturalWidth;
    const zoomToFitHeight = containerHeight / image.naturalHeight;

    // Use the smaller zoom to ensure entire image fits
    const fitZoom = Math.min(zoomToFitWidth, zoomToFitHeight);

    // Clamp to valid zoom range
    return Math.max(MIN_ZOOM, Math.min(fitZoom, MAX_ZOOM));
  }, []);

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
      <div
        ref={containerRef}
        className={`h-full overflow-auto bg-gray-100 dark:bg-gray-800 pb-40 image-viewer-scroll ${
          zoomLevel > 1 ? 'cursor-grab active:cursor-grabbing' : ''
        }`}
        id="image-container"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: zoomLevel > 1 ? 'pan-x pan-y' : 'auto',
          overscrollBehavior: 'contain'
        }}
      >
        <div
          className={`p-4 ${zoomLevel <= 1 ? 'flex justify-center items-start' : ''}`}
          style={{ minHeight: '100%' }}
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
              onLoad={() => {
                setIsLoading(false);
                // On desktop, calculate zoom to fit entire page in viewport
                if (isDesktop) {
                  const fitZoom = calculateFitZoom();
                  setZoomLevel(fitZoom);
                }
              }}
              onError={() => {
                setImageError(true);
                setIsLoading(false);
              }}
              style={{
                width: `${zoomLevel * 100}%`,
                maxWidth: 'none'
              }}
            />
          )}
        </div>
      </div>

      {/* Navigation and Zoom Controls - Fixed at bottom of viewport */}
      <div className="fixed bottom-0 left-0 right-0 lg:left-80 bg-white dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700 p-4 z-20">
        <div className="flex flex-col gap-3 max-w-4xl mx-auto">
          {/* Zoom Controls */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={zoomOut}
              disabled={zoomLevel <= MIN_ZOOM}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition text-lg font-bold"
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
              className="w-32 h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer"
              title="Zoom level"
            />
            <button
              onClick={zoomIn}
              disabled={zoomLevel >= MAX_ZOOM}
              className="px-3 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-300 dark:hover:bg-gray-600 transition text-lg font-bold"
              title="Zoom in"
            >
              +
            </button>
            <span className="text-sm text-gray-600 dark:text-gray-400 w-14 text-center">
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
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition ml-2"
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
              className="px-2 py-1 text-xs bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition ml-2"
              title="Print pages"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            </button>
          </div>

          {/* Page Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage <= minPage}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition"
            >
              Previous
            </button>

            <div className="flex items-center gap-4">
              <span className="text-sm">
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
            </div>

            <button
              onClick={goToNextPage}
              disabled={currentPage >= totalPages}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition"
            >
              Next
            </button>
          </div>

          {/* Zoom hint */}
          <p className="text-xs text-gray-500 dark:text-gray-500 text-center">
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
    </div>
  );
}
