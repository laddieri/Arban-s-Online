'use client';

import { useState, useEffect } from 'react';

const EDGE_THRESHOLD = 80; // pixels from edge to trigger

/**
 * Whether the mouse is near the left or right edge of the viewport, for the
 * desktop edge page-turn buttons. leftInset is where the left edge starts
 * (the open sidebar's width).
 */
export function useEdgeHover(enabled: boolean, leftInset: number) {
  const [showLeftNav, setShowLeftNav] = useState(false);
  const [showRightNav, setShowRightNav] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const handleMouseMove = (e: MouseEvent) => {
      const x = e.clientX;
      setShowLeftNav(x >= leftInset && x < leftInset + EDGE_THRESHOLD);
      setShowRightNav(x > window.innerWidth - EDGE_THRESHOLD);
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
  }, [enabled, leftInset]);

  return { showLeftNav, showRightNav };
}
