'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface ImageViewerProps {
  baseUrl: string;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  imageFormat?: string;
}

const MIN_ZOOM = 0.5;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export default function ImageViewer({
  baseUrl,
  totalPages,
  currentPage,
  onPageChange,
  imageFormat = 'jpg'
}: ImageViewerProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const containerRef = useRef<HTMLDivElement>(null);

  // Reset loading state and zoom when page changes
  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
    setZoomLevel(1); // Reset zoom when changing pages
  }, [currentPage]);

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

  const goToPreviousPage = () => {
    if (currentPage > 0) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 0 && page <= totalPages) {
      onPageChange(page);
    }
  };

  // Format page number with leading zeros (e.g., 001, 002, 003)
  const formatPageNumber = (num: number) => {
    return num.toString().padStart(3, '0');
  };

  // Construct image URL
  const getImageUrl = (pageNum: number) => {
    const paddedNum = formatPageNumber(pageNum);
    return `${baseUrl}/page-${paddedNum}.${imageFormat}`;
  };

  const currentImageUrl = getImageUrl(currentPage);

  // Preload next and previous images for smoother navigation
  useEffect(() => {
    if (currentPage < totalPages) {
      const nextImage = new window.Image();
      nextImage.src = getImageUrl(currentPage + 1);
    }
    if (currentPage > 0) {
      const prevImage = new window.Image();
      prevImage.src = getImageUrl(currentPage - 1);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col h-full">
      <div
        ref={containerRef}
        className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800"
        id="image-container"
        style={{
          WebkitOverflowScrolling: 'touch',
          touchAction: zoomLevel > 1 ? 'pan-x pan-y' : 'auto'
        }}
      >
        <div className="p-4 flex justify-center" style={{ minHeight: '100%', alignItems: 'flex-start' }}>
          {isLoading && !imageError && (
            <div className="absolute flex items-center justify-center inset-0">
              <div className="text-lg text-gray-600 dark:text-gray-400">Loading page {currentPage}...</div>
            </div>
          )}

          {imageError ? (
            <div className="flex flex-col items-center justify-center h-96 text-center p-8">
              <div className="text-lg text-red-600 dark:text-red-400 mb-4">
                Error loading page {currentPage}
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
              src={currentImageUrl}
              alt={`Page ${currentPage} of ${totalPages}`}
              className={`h-auto shadow-lg transition-all duration-100 ${
                isLoading ? 'opacity-0' : 'opacity-100'
              }`}
              onLoad={() => setIsLoading(false)}
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

      {/* Navigation and Zoom Controls */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700 p-4 flex-shrink-0">
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
          </div>

          {/* Page Navigation */}
          <div className="flex items-center justify-between">
            <button
              onClick={goToPreviousPage}
              disabled={currentPage <= 0}
              className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition"
            >
              Previous
            </button>

            <div className="flex items-center gap-4">
              <span className="text-sm">
                Page{' '}
                <input
                  type="number"
                  min={0}
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => goToPage(parseInt(e.target.value) || 0)}
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
    </div>
  );
}
