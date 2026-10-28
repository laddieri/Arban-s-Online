// Places a scanned page on a sheet of paper so the printed music - not the
// scan's own (inconsistent) paper border - sits inside uniform margins.
// Pure geometry; the content box comes from utils/contentBounds.ts.

import type { ContentBounds } from './contentBounds';

/** Placement of one page on the sheet, all values in inches. */
export interface PrintPlacement {
  /** Visible window onto the scan (the content box), relative to the sheet */
  cropLeft: number;
  cropTop: number;
  cropWidth: number;
  cropHeight: number;
  /** The full scan's size and offset inside that window */
  imageWidth: number;
  imageHeight: number;
  imageLeft: number;
  imageTop: number;
}

// Never enlarge the content past this multiple of the "whole scan fits the
// sheet" size. A real page's music fills most of the scan, so this only
// kicks in on sparse pages (a lone title, a short final exercise), where
// filling the margins would print giant notes.
export const MAX_ENLARGEMENT = 1.5;

// Content that fills less than this share of the available height is a
// partly-empty page: it starts at the top margin, like the printed book,
// instead of floating in the middle of the sheet.
const TOP_ALIGN_BELOW = 0.8;

/**
 * Scale the content box of a scan to the largest size that fits inside the
 * sheet minus `margin` on every side, centred horizontally. Without a
 * content box the whole scan is fitted inside the margins instead.
 */
export function computePrintPlacement(
  bounds: ContentBounds | null,
  naturalWidth: number,
  naturalHeight: number,
  paperWidth: number,
  paperHeight: number,
  margin: number
): PrintPlacement {
  const box = bounds ?? { left: 0, top: 0, right: 1, bottom: 1 };
  const contentW = (box.right - box.left) * naturalWidth;
  const contentH = (box.bottom - box.top) * naturalHeight;
  const availW = paperWidth - 2 * margin;
  const availH = paperHeight - 2 * margin;

  const wholeScanScale = Math.min(availW / naturalWidth, availH / naturalHeight);
  const scale = Math.min(
    availW / contentW,
    availH / contentH,
    wholeScanScale * MAX_ENLARGEMENT
  );

  const cropWidth = contentW * scale;
  const cropHeight = contentH * scale;
  const cropLeft = (paperWidth - cropWidth) / 2;
  const cropTop =
    cropHeight < availH * TOP_ALIGN_BELOW ? margin : (paperHeight - cropHeight) / 2;

  return {
    cropLeft,
    cropTop,
    cropWidth,
    cropHeight,
    imageWidth: naturalWidth * scale,
    imageHeight: naturalHeight * scale,
    imageLeft: -box.left * naturalWidth * scale,
    imageTop: -box.top * naturalHeight * scale,
  };
}

/**
 * CSS filter that turns a scan's toned/yellowed paper white (and the page
 * grayscale), so it doesn't show as a tinted box inside white margins.
 */
export function paperWhiteningFilter(paperLuminance: number): string {
  const gain = Math.min((255 / paperLuminance) * 1.04, 1.8);
  return `grayscale(1) brightness(${gain.toFixed(3)})`;
}
