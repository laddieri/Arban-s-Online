'use client';

import { useState, useRef, useEffect } from 'react';
import { ExerciseVideo } from '@/config/exerciseVideos';

interface YouTubeVideosOverlayProps {
  isOpen: boolean;
  onClose: () => void;
  videos: ExerciseVideo[];
}

const MIN_WIDTH = 400;
const MIN_HEIGHT = 300;
const DEFAULT_WIDTH = 560;
const DEFAULT_HEIGHT = 420;

// Mobile-friendly minimum sizes
const MOBILE_MIN_WIDTH = 280;
const MOBILE_MIN_HEIGHT = 200;

export default function YouTubeVideosOverlay({
  isOpen,
  onClose,
  videos,
}: YouTubeVideosOverlayProps) {
  const [position, setPosition] = useState({ x: 60, y: 60 });
  const [size, setSize] = useState({ width: DEFAULT_WIDTH, height: DEFAULT_HEIGHT });
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0);
  // Facade pattern: show a thumbnail until the user presses play, then mount
  // the real (heavy, cookie-setting) YouTube iframe with autoplay
  const [playerActive, setPlayerActive] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const resizeStart = useRef({ x: 0, y: 0, width: 0, height: 0 });
  const overlayRef = useRef<HTMLDivElement>(null);

  // Initialize with responsive sizing for mobile
  useEffect(() => {
    if (!isInitialized && typeof window !== 'undefined') {
      const isMobile = window.innerWidth < 768;

      if (isMobile) {
        // On mobile, use viewport with conservative padding for browser chrome/toolbars
        const mobileWidth = Math.min(window.innerWidth - 20, DEFAULT_WIDTH);
        // Account for mobile browser bars (top ~60-100px, bottom ~50px) plus safety margin
        const mobileHeight = Math.min(window.innerHeight - 180, DEFAULT_HEIGHT);

        setSize({
          width: Math.max(MOBILE_MIN_WIDTH, mobileWidth),
          height: Math.max(MOBILE_MIN_HEIGHT, mobileHeight),
        });

        // Center on mobile with top offset to avoid URL bar
        setPosition({
          x: Math.max(10, (window.innerWidth - mobileWidth) / 2),
          y: Math.max(20, (window.innerHeight - mobileHeight) / 2),
        });
      }

      setIsInitialized(true);
    }
  }, [isInitialized]);

  // Reset to first video when videos change
  useEffect(() => {
    setCurrentVideoIndex(0);
    setPlayerActive(false);
  }, [videos]);

  // Handle dragging
  useEffect(() => {
    if (!isDragging) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      // Calculate new position with boundary checking
      const maxX = window.innerWidth - (overlayRef.current?.offsetWidth || 0);
      const maxY = window.innerHeight - (overlayRef.current?.offsetHeight || 0);

      const newX = Math.max(0, Math.min(maxX, clientX - dragOffset.current.x));
      const newY = Math.max(0, Math.min(maxY, clientY - dragOffset.current.y));

      setPosition({ x: newX, y: newY });
    };

    const handleEnd = () => {
      setIsDragging(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isDragging]);

  // Handle resizing
  useEffect(() => {
    if (!isResizing) return;

    const handleMove = (e: MouseEvent | TouchEvent) => {
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

      const deltaX = clientX - resizeStart.current.x;
      const deltaY = clientY - resizeStart.current.y;

      // Calculate new size with boundary checking
      const maxWidth = window.innerWidth - position.x;
      const maxHeight = window.innerHeight - position.y;

      // Use mobile-friendly minimums on small screens
      const isMobile = window.innerWidth < 768;
      const minWidth = isMobile ? MOBILE_MIN_WIDTH : MIN_WIDTH;
      const minHeight = isMobile ? MOBILE_MIN_HEIGHT : MIN_HEIGHT;

      const newWidth = Math.max(minWidth, Math.min(maxWidth, resizeStart.current.width + deltaX));
      const newHeight = Math.max(minHeight, Math.min(maxHeight, resizeStart.current.height + deltaY));

      setSize({
        width: newWidth,
        height: newHeight,
      });
    };

    const handleEnd = () => {
      setIsResizing(false);
    };

    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
    document.addEventListener('touchmove', handleMove);
    document.addEventListener('touchend', handleEnd);

    return () => {
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('mouseup', handleEnd);
      document.removeEventListener('touchmove', handleMove);
      document.removeEventListener('touchend', handleEnd);
    };
  }, [isResizing, position]);

  const handleDragStart = (e: React.MouseEvent | React.TouchEvent) => {
    if ((e.target as HTMLElement).closest('button')) return;

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setIsDragging(true);
    dragOffset.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
  };

  const handleResizeStart = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;

    setIsResizing(true);
    resizeStart.current = {
      x: clientX,
      y: clientY,
      width: size.width,
      height: size.height,
    };
  };

  const handlePreviousVideo = () => {
    setCurrentVideoIndex((prev) => (prev > 0 ? prev - 1 : videos.length - 1));
    setPlayerActive(false);
  };

  const handleNextVideo = () => {
    setCurrentVideoIndex((prev) => (prev < videos.length - 1 ? prev + 1 : 0));
    setPlayerActive(false);
  };

  if (!isOpen || videos.length === 0) return null;

  const currentVideo = videos[currentVideoIndex];
  // nocookie domain: no tracking cookies until the user actually plays.
  // autoplay=1 because the iframe only mounts after a deliberate play click.
  const embedUrl = `https://www.youtube-nocookie.com/embed/${currentVideo.videoId}?autoplay=1`;
  const thumbnailUrl = `https://i.ytimg.com/vi/${currentVideo.videoId}/hqdefault.jpg`;

  return (
    <div
      ref={overlayRef}
      className="fixed z-50 shadow-2xl rounded-lg overflow-hidden bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600"
      style={{
        left: position.x,
        top: position.y,
        width: isMinimized ? '280px' : `${size.width}px`,
        height: isMinimized ? '40px' : `${size.height}px`,
      }}
    >
      {/* Header / Drag handle */}
      <div
        className="flex items-center justify-between px-3 py-2 bg-red-600 text-white cursor-move select-none"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <span className="text-sm font-medium flex items-center gap-2">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-4 w-4"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
          </svg>
          Exercise Videos
          {videos.length > 1 && (
            <span className="text-xs opacity-90">
              ({currentVideoIndex + 1}/{videos.length})
            </span>
          )}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsMinimized(!isMinimized)}
            className="p-1 hover:bg-red-500 rounded transition"
            title={isMinimized ? 'Expand' : 'Minimize'}
          >
            {isMinimized ? (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4"
                />
              </svg>
            ) : (
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
              </svg>
            )}
          </button>
          <button
            onClick={onClose}
            className="p-1 hover:bg-red-500 rounded transition"
            title="Close"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>

      {/* Video content */}
      {!isMinimized && (
        <>
          <div className="flex flex-col h-[calc(100%-40px)]">
            {/* Video player. Facade until play is pressed; while the window
                is being dragged/resized the iframe must not capture the
                pointer, or the drag sticks the moment the cursor crosses it */}
            <div className="flex-grow bg-black relative">
              {playerActive ? (
                <iframe
                  src={embedUrl}
                  className={`w-full h-full border-0 ${
                    isDragging || isResizing ? 'pointer-events-none' : ''
                  }`}
                  title={currentVideo.title}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <button
                  onClick={() => setPlayerActive(true)}
                  className="group w-full h-full relative flex items-center justify-center"
                  aria-label={`Play ${currentVideo.title}`}
                  data-testid="video-facade"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailUrl}
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
              )}
            </div>

            {/* Video info and controls */}
            <div className="bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              {/* Video navigation */}
              {videos.length > 1 && (
                <div className="flex items-center justify-center gap-1 sm:gap-2 px-2 sm:px-3 py-2 border-b border-gray-200 dark:border-gray-700">
                  <button
                    onClick={handlePreviousVideo}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition flex-shrink-0"
                    title="Previous video"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-700 dark:text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400 font-medium min-w-[50px] sm:min-w-[60px] text-center flex-shrink-0">
                    {currentVideoIndex + 1} / {videos.length}
                  </span>
                  <button
                    onClick={handleNextVideo}
                    className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition flex-shrink-0"
                    title="Next video"
                  >
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-5 w-5 text-gray-700 dark:text-gray-300"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Video metadata */}
              <div className="px-2 sm:px-3 py-2 max-h-16 sm:max-h-24 overflow-y-auto overflow-x-hidden">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-1 break-words">
                  {currentVideo.title}
                </h3>
                {currentVideo.performer && (
                  <p className="text-xs text-gray-600 dark:text-gray-400 mb-1 break-words">
                    Performer: {currentVideo.performer}
                  </p>
                )}
                {currentVideo.description && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 break-words">
                    {currentVideo.description}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Resize handle - larger touch target for mobile */}
          <div
            className="absolute bottom-0 right-0 w-12 h-12 cursor-se-resize flex items-end justify-end p-1 touch-none"
            onMouseDown={handleResizeStart}
            onTouchStart={handleResizeStart}
          >
            <svg
              className="w-6 h-6 text-gray-400 dark:text-gray-500 opacity-70 hover:opacity-100 transition-opacity"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM18 18H16V16H18V18ZM14 22H12V20H14V22Z" />
            </svg>
          </div>
        </>
      )}
    </div>
  );
}
