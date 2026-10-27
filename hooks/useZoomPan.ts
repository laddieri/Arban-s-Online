'use client';

import { useState, useEffect, useLayoutEffect, useRef, useCallback, RefObject } from 'react';

export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 3;
export const ZOOM_STEP = 0.1;

type Point = { x: number; y: number };

/**
 * Zoom and pan for the page viewer's scroll container: mouse wheel zooms at
 * the cursor, click-drag pans, two-finger pinch zooms at the pinch midpoint.
 *
 * All user zoom changes funnel through applyZoom with an anchor point
 * (cursor, pinch midpoint, or container center) so the content under the
 * anchor stays put. The scroll correction runs in a layout effect after
 * React has committed the new content width.
 *
 * isManual records whether the user has zoomed by hand since it was last
 * cleared; programmatic setZoom calls (initial fit, layout changes,
 * fullscreen auto-fit) leave it alone.
 */
export function useZoomPan(containerRef: RefObject<HTMLDivElement>) {
  const [zoomLevel, setZoomLevel] = useState(1);
  const zoomRef = useRef(zoomLevel);
  zoomRef.current = zoomLevel;
  const pendingAnchorRef = useRef<(Point & { prevZoom: number }) | null>(null);
  // Scroll target to apply right after a programmatic zoom commits
  const pendingScrollRef = useRef<{ left: number; top: number } | null>(null);
  const manualZoomRef = useRef(false);

  const applyZoom = useCallback((newZoom: number, anchor?: Point) => {
    manualZoomRef.current = true;
    setZoomLevel(prev => {
      const clamped = Math.min(Math.max(newZoom, MIN_ZOOM), MAX_ZOOM);
      if (clamped !== prev && anchor) {
        pendingAnchorRef.current = { ...anchor, prevZoom: prev };
      }
      return clamped;
    });
  }, []);

  /** Programmatic zoom, optionally scrolling to a position at that zoom */
  const setZoom = useCallback((level: number, scroll?: { left: number; top: number }) => {
    const container = containerRef.current;
    if (scroll && container && level === zoomRef.current) {
      container.scrollLeft = scroll.left;
      container.scrollTop = scroll.top;
      return;
    }
    pendingScrollRef.current = scroll ?? null;
    setZoomLevel(level);
  }, [containerRef]);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const scroll = pendingScrollRef.current;
    pendingScrollRef.current = null;
    if (scroll && container) {
      container.scrollLeft = scroll.left;
      container.scrollTop = scroll.top;
      return;
    }
    const anchor = pendingAnchorRef.current;
    pendingAnchorRef.current = null;
    if (!anchor || !container) return;
    const rect = container.getBoundingClientRect();
    const px = anchor.x - rect.left;
    const py = anchor.y - rect.top;
    const scale = zoomLevel / anchor.prevZoom;
    container.scrollLeft = (container.scrollLeft + px) * scale - px;
    container.scrollTop = (container.scrollTop + py) * scale - py;
  }, [zoomLevel, containerRef]);

  const containerCenter = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    return rect
      ? { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
      : undefined;
  }, [containerRef]);

  const zoomIn = useCallback(() => {
    applyZoom(zoomRef.current + ZOOM_STEP, containerCenter());
  }, [applyZoom, containerCenter]);

  const zoomOut = useCallback(() => {
    applyZoom(zoomRef.current - ZOOM_STEP, containerCenter());
  }, [applyZoom, containerCenter]);

  const resetZoom = useCallback(() => {
    manualZoomRef.current = true;
    setZoomLevel(1);
  }, []);

  /** Zoom slider: a hand zoom, but with no anchor (the slider isn't on the page) */
  const setZoomFromSlider = useCallback((level: number) => {
    manualZoomRef.current = true;
    setZoomLevel(level);
  }, []);

  const isManual = useCallback(() => manualZoomRef.current, []);
  const clearManual = useCallback(() => {
    manualZoomRef.current = false;
  }, []);
  const getZoom = useCallback(() => zoomRef.current, []);

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
  }, [applyZoom, containerRef]);

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
  }, [containerRef]);

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
  }, [applyZoom, containerRef]);

  return {
    zoomLevel,
    getZoom,
    setZoom,
    zoomIn,
    zoomOut,
    resetZoom,
    setZoomFromSlider,
    isManual,
    clearManual,
    isPanning,
  };
}
