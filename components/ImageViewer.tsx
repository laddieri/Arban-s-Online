'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';

interface ImageViewerProps {
  baseUrl: string;
  totalPages: number;
  currentPage: number;
  onPageChange: (page: number) => void;
  imageFormat?: string;
}

export default function ImageViewer({
  baseUrl,
  totalPages,
  currentPage,
  onPageChange,
  imageFormat = 'jpg'
}: ImageViewerProps) {
  const [imageError, setImageError] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Reset loading state when page changes
  useEffect(() => {
    setIsLoading(true);
    setImageError(false);
  }, [currentPage]);

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= totalPages) {
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
    if (currentPage > 1) {
      const prevImage = new window.Image();
      prevImage.src = getImageUrl(currentPage - 1);
    }
  }, [currentPage, totalPages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-800" id="image-container">
        <div className="flex justify-center items-center p-4 min-h-full">
          {isLoading && !imageError && (
            <div className="absolute flex items-center justify-center">
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
            <div className="relative max-w-full">
              <img
                src={currentImageUrl}
                alt={`Page ${currentPage} of ${totalPages}`}
                className={`max-w-full h-auto shadow-lg transition-opacity duration-300 ${
                  isLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={() => setIsLoading(false)}
                onError={() => {
                  setImageError(true);
                  setIsLoading(false);
                }}
                style={{ maxHeight: 'calc(100vh - 200px)' }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="bg-white dark:bg-gray-900 border-t border-gray-300 dark:border-gray-700 p-4">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <button
            onClick={goToPreviousPage}
            disabled={currentPage <= 1}
            className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400 disabled:cursor-not-allowed hover:bg-blue-700 transition"
          >
            Previous
          </button>

          <div className="flex items-center gap-4">
            <span className="text-sm">
              Page{' '}
              <input
                type="number"
                min={1}
                max={totalPages}
                value={currentPage}
                onChange={(e) => goToPage(parseInt(e.target.value) || 1)}
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
      </div>
    </div>
  );
}
