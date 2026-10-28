'use client';

import { useEffect, useRef, RefObject } from 'react';
import { combineSpreadBounds, type ContentBounds } from '@/utils/contentBounds';
import { getPageContentBounds } from '@/lib/pageBounds';
import { MIN_ZOOM, MAX_ZOOM, useZoomPan } from './useZoomPan';

interface FullscreenFitOptions {
  isFullscreen: boolean;
  /** Fit only once the current page image has loaded */
  isReady: boolean;
  currentPage: number;
  /** Right-hand page in two-page view, else null */
  secondPage: number | null;
  bookId: string;
  pageOffset: number;
  /** The image URL the viewer displays for a page */
  imageUrl: (page: number) => string;
  /** Same-origin URL for a page (canvas sampling of CDN images can be CORS-blocked) */
  proxyUrl: (page: number) => string;
  containerRef: RefObject<HTMLDivElement>;
  imageRef: RefObject<HTMLImageElement>;
  zoom: ReturnType<typeof useZoomPan>;
  /** With even margins on: the shown sheets' content box, as fractions of
   *  the zoomed content's width and height (already laid out on screen) */
  getSheetContentBox?: () => ContentBounds | null;
}

/**
 * Smart fullscreen: while fullscreen, zoom and scroll so the printed music -
 * not the page's white paper margins - spans (almost) the full screen width.
 * The ink bounding box comes from sampling the page image on a canvas; pages
 * where detection fails (blank, unreadable, CORS-blocked) keep the ordinary
 * fullscreen behavior.
 *
 * Entering fullscreen remembers the zoom to restore on exit and re-arms the
 * auto-fit; zooming by hand while fullscreen takes back control.
 */
export function useFullscreenFit({
  isFullscreen,
  isReady,
  currentPage,
  secondPage,
  bookId,
  pageOffset,
  imageUrl,
  proxyUrl,
  containerRef,
  imageRef,
  zoom,
  getSheetContentBox,
}: FullscreenFitOptions) {
  const preFullscreenZoomRef = useRef<number | null>(null);

  useEffect(() => {
    if (isFullscreen) {
      preFullscreenZoomRef.current = zoom.getZoom();
      zoom.clearManual();
    } else if (preFullscreenZoomRef.current !== null) {
      zoom.setZoom(preFullscreenZoomRef.current);
      preFullscreenZoomRef.current = null;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]);

  useEffect(() => {
    if (!isFullscreen || !isReady || zoom.isManual()) return;
    const img = imageRef.current;
    if (!img || !img.naturalWidth) return;

    const EDGE = 0.01; // screen fraction left as breathing room per side

    // Even margins: the sheets are already laid out, so fit their content
    // box directly. Its fractions don't change with zoom (all sizes scale).
    const sheetBox = getSheetContentBox?.();
    const container = containerRef.current;
    const content = container?.firstElementChild;
    if (sheetBox && container && content) {
      const viewWidth = container.clientWidth;
      const fitZoom = Math.min(
        Math.max((1 - 2 * EDGE) / (sheetBox.right - sheetBox.left), MIN_ZOOM),
        MAX_ZOOM
      );
      const scale = fitZoom / zoom.getZoom();
      const innerWidth = content.getBoundingClientRect().width * scale;
      const innerHeight = content.getBoundingClientRect().height * scale;
      const edgePx = EDGE * viewWidth;
      zoom.setZoom(fitZoom, {
        left: Math.max(0, sheetBox.left * innerWidth - edgePx),
        top: Math.max(0, sheetBox.top * innerHeight - edgePx),
      });
      return;
    }

    let cancelled = false;
    (async () => {
      let box = await getPageContentBounds(imageUrl(currentPage), proxyUrl(currentPage));
      if (secondPage !== null) {
        box = combineSpreadBounds(
          box,
          await getPageContentBounds(imageUrl(secondPage), proxyUrl(secondPage))
        );
      }
      const container = containerRef.current;
      if (cancelled || !box || !container || zoom.isManual()) return;

      const viewWidth = container.clientWidth;
      const fitZoom = Math.min(
        Math.max((1 - 2 * EDGE) / (box.right - box.left), MIN_ZOOM),
        MAX_ZOOM
      );
      // Layout at fitZoom: the zoomed content div is fitZoom * viewWidth
      // wide; in a spread each page takes half of it. Scroll targets put
      // the content box's top-left just inside the screen edge.
      const innerWidth = fitZoom * viewWidth;
      const pageWidth = secondPage !== null ? innerWidth / 2 : innerWidth;
      const imgHeight = pageWidth * (img.naturalHeight / img.naturalWidth);
      const edgePx = EDGE * viewWidth;
      zoom.setZoom(fitZoom, {
        left: Math.max(0, box.left * innerWidth - edgePx),
        top: Math.max(0, box.top * imgHeight - edgePx),
      });
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen, isReady, currentPage, secondPage, bookId, pageOffset, !!getSheetContentBox]);
}
