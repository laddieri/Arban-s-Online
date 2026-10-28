'use client';

import { useEffect, useRef, useState, type CSSProperties, type RefObject } from 'react';
import { getPageContentBounds } from '@/lib/pageBounds';
import type { ContentBounds } from '@/utils/contentBounds';
import { computePrintPlacement, paperWhiteningFilter } from '@/utils/printLayout';

// The on-screen "sheet" matches the default print layout (letter paper,
// half-inch margins), so what you see is what prints.
const SHEET_WIDTH = 8.5;
const SHEET_HEIGHT = 11;
const SHEET_MARGIN = 0.5;

// How long a newly shown page stays hidden while its music is measured,
// before the raw scan is shown instead (it snaps to the sheet once measured).
const MEASURE_WAIT_MS = 250;

type Measurement =
  | { state: 'pending' }
  | { state: 'done'; bounds: ContentBounds | null };

interface PageSheetProps {
  src: string;
  /** Same-origin URL for canvas sampling when the CDN copy is CORS-blocked */
  proxySrc: string;
  alt: string;
  /** Trim the scan's paper border and show the music inside even margins */
  evenMargins: boolean;
  /** CSS width of the page within the zoomed content */
  width: string;
  className?: string;
  imgRef?: RefObject<HTMLImageElement>;
  onLoad?: () => void;
  onError?: () => void;
  /** Reports whether this page's final layout is on screen */
  onSettledChange?: (settled: boolean) => void;
}

/**
 * One page of the viewer. With even margins on, the scan is cropped to its
 * printed content (utils/contentBounds.ts) and placed on a white sheet with
 * uniform margins - the same placement the print dialog uses - so pages
 * with different scan borders line up at the same size. Pages whose content
 * can't be measured show the raw scan.
 */
export default function PageSheet({
  src,
  proxySrc,
  alt,
  evenMargins,
  width,
  className = '',
  imgRef,
  onLoad,
  onError,
  onSettledChange,
}: PageSheetProps) {
  const localRef = useRef<HTMLImageElement>(null);
  const ref = imgRef ?? localRef;
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [measurement, setMeasurement] = useState<Measurement>({ state: 'pending' });
  const [waitExpired, setWaitExpired] = useState(false);
  const onSettledRef = useRef(onSettledChange);
  onSettledRef.current = onSettledChange;

  useEffect(() => {
    setMeasurement({ state: 'pending' });
    setWaitExpired(false);
    if (!evenMargins) return;
    let cancelled = false;
    const timer = setTimeout(() => setWaitExpired(true), MEASURE_WAIT_MS);
    getPageContentBounds(src, proxySrc).then(bounds => {
      if (!cancelled) setMeasurement({ state: 'done', bounds });
    });
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [src, proxySrc, evenMargins]);

  // A cached image can finish loading before React attaches onLoad
  useEffect(() => {
    const img = ref.current;
    setNatural(img && img.complete && img.naturalWidth
      ? { w: img.naturalWidth, h: img.naturalHeight }
      : null);
  }, [src, ref]);

  const bounds = measurement.state === 'done' ? measurement.bounds : null;
  const showSheet = evenMargins && !!bounds && !!natural;
  // Hidden only while the sheet layout is still on its way
  const hidden =
    evenMargins && !showSheet && (measurement.state === 'pending' || !natural) && !waitExpired;
  const settled = !evenMargins || (measurement.state === 'done' && !!natural);

  useEffect(() => {
    onSettledRef.current?.(settled);
  }, [settled]);

  // The element tree is the same with or without the sheet, so switching
  // layouts restyles the image instead of remounting (and reloading) it
  const p = showSheet
    ? computePrintPlacement(bounds, natural.w, natural.h, SHEET_WIDTH, SHEET_HEIGHT, SHEET_MARGIN)
    : null;
  const pct = (value: number, of: number) => `${(value / of) * 100}%`;

  // While measuring, the (hidden) page already takes the sheet's shape, so
  // the layout - and a restored scroll position - doesn't jump when it lands
  const sheetShaped = !!p || hidden;
  const sheetStyle: CSSProperties = sheetShaped
    ? { width, aspectRatio: `${SHEET_WIDTH} / ${SHEET_HEIGHT}` }
    : { width };
  const cropStyle: CSSProperties | undefined = p
    ? {
        left: pct(p.cropLeft, SHEET_WIDTH),
        top: pct(p.cropTop, SHEET_HEIGHT),
        width: pct(p.cropWidth, SHEET_WIDTH),
        height: pct(p.cropHeight, SHEET_HEIGHT),
      }
    : undefined;
  const imgStyle: CSSProperties = p
    ? {
        position: 'absolute',
        left: pct(p.imageLeft, p.cropWidth),
        top: pct(p.imageTop, p.cropHeight),
        width: pct(p.imageWidth, p.cropWidth),
        height: pct(p.imageHeight, p.cropHeight),
        ...(bounds?.paperLuminance ? { filter: paperWhiteningFilter(bounds.paperLuminance) } : {}),
      }
    : { width: '100%' };

  return (
    <div
      className={`relative shrink-0 ${sheetShaped ? 'overflow-hidden' : ''} ${p ? 'bg-white' : ''}`}
      style={sheetStyle}
    >
      <div
        data-sheet-crop={p ? '' : undefined}
        className={p ? 'absolute overflow-hidden' : undefined}
        style={cropStyle}
      >
        <img
          ref={ref}
          src={src}
          alt={alt}
          draggable={false}
          className={className}
          data-even-margins={p ? 'on' : 'off'}
          onLoad={e => {
            const el = e.currentTarget;
            setNatural({ w: el.naturalWidth, h: el.naturalHeight });
            onLoad?.();
          }}
          onError={onError}
          style={{ maxWidth: 'none', ...(hidden ? { opacity: 0 } : {}), ...imgStyle }}
        />
      </div>
    </div>
  );
}
