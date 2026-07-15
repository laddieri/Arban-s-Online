// Finds the bounding box of the printed music on a scanned page so the
// viewer can zoom past the paper margins ("smart fullscreen").
// Pure pixel math - the browser-side image loading lives in lib/pageBounds.ts.

/** Edges of the page content as fractions of the image size (0..1). */
export interface ContentBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// Ink must be this much darker than the page's own paper tone. Old scans
// have toned/yellowed paper well below "white", so a fixed threshold would
// classify the entire page as ink; measuring relative to the median
// luminance (paper covers most of a page, so the median IS the paper)
// adapts to each scan.
const INK_DELTA = 35;

// ...but a pixel lighter than this is never ink, no matter the paper tone.
const MAX_INK_LUMINANCE = 220;

// A median darker than this means the image isn't a readable page scan
// (or the sampling failed); don't trust any box derived from it.
const MIN_PAPER_LUMINANCE = 140;

// A row/column where most pixels are ink is a scanner artifact - a black
// edge band or gutter shadow - not music. Such bands are trimmed from the
// page edges before looking for content.
const BORDER_INK_FRACTION = 0.7;
// ...but never trim deeper than this into the page.
const MAX_BORDER_TRIM = 0.2;

// A row/column needs a minimum share of ink pixels before it counts as
// content, so scanner dust and JPEG speckle don't stretch the box out to
// the paper edge.
const MIN_INK_FRACTION = 0.01;

// Breathing room added around the detected box, as a fraction of the image.
const PADDING = 0.015;

// Sanity floor: a detected box narrower than this is a mostly-blank page
// (or noise) - zooming "to fit" it would be disorienting, so report nothing.
const MIN_BOX_FRACTION = 0.25;

/**
 * Bounding box of the printed content in an RGBA pixel buffer, or null when
 * the page is blank, too sparse, or too degraded to trust. Fractions of the
 * image size.
 */
export function findContentBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number
): ContentBounds | null {
  if (width < 4 || height < 4 || data.length < width * height * 4) return null;

  // Luminance per pixel + histogram for the paper tone
  const lum = new Uint8Array(width * height);
  const hist = new Uint32Array(256);
  for (let p = 0, i = 0; p < lum.length; p++, i += 4) {
    const l =
      (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
    lum[p] = l;
    hist[l]++;
  }
  let acc = 0;
  let median = 255;
  for (let l = 0; l < 256; l++) {
    acc += hist[l];
    if (acc >= lum.length / 2) {
      median = l;
      break;
    }
  }
  if (median < MIN_PAPER_LUMINANCE) return null;
  const inkBelow = Math.min(median - INK_DELTA, MAX_INK_LUMINANCE);

  const rowInk = new Uint32Array(height);
  const colInk = new Uint32Array(width);
  for (let y = 0; y < height; y++) {
    const row = y * width;
    for (let x = 0; x < width; x++) {
      if (lum[row + x] < inkBelow) {
        rowInk[y]++;
        colInk[x]++;
      }
    }
  }

  // Trim solid scanner bands (black edges, gutter shadow) from each edge
  const borderRow = width * BORDER_INK_FRACTION;
  const borderCol = height * BORDER_INK_FRACTION;
  const maxTrimY = Math.floor(height * MAX_BORDER_TRIM);
  const maxTrimX = Math.floor(width * MAX_BORDER_TRIM);
  let frameTop = 0;
  while (frameTop < maxTrimY && rowInk[frameTop] >= borderRow) frameTop++;
  let frameBottom = height - 1;
  while (frameBottom > height - 1 - maxTrimY && rowInk[frameBottom] >= borderRow) frameBottom--;
  let frameLeft = 0;
  while (frameLeft < maxTrimX && colInk[frameLeft] >= borderCol) frameLeft++;
  let frameRight = width - 1;
  while (frameRight > width - 1 - maxTrimX && colInk[frameRight] >= borderCol) frameRight--;
  if (frameTop >= frameBottom || frameLeft >= frameRight) return null;

  // Recount inside the trimmed frame, so a trimmed band can't inflate the
  // counts of the rows/columns that cross it
  const frameRowInk = new Uint32Array(height);
  const frameColInk = new Uint32Array(width);
  for (let y = frameTop; y <= frameBottom; y++) {
    const row = y * width;
    for (let x = frameLeft; x <= frameRight; x++) {
      if (lum[row + x] < inkBelow) {
        frameRowInk[y]++;
        frameColInk[x]++;
      }
    }
  }

  const minRowInk = Math.max(3, (frameRight - frameLeft + 1) * MIN_INK_FRACTION);
  const minColInk = Math.max(3, (frameBottom - frameTop + 1) * MIN_INK_FRACTION);

  let top = frameTop;
  while (top <= frameBottom && frameRowInk[top] < minRowInk) top++;
  if (top > frameBottom) return null;
  let bottom = frameBottom;
  while (bottom > top && frameRowInk[bottom] < minRowInk) bottom--;
  let left = frameLeft;
  while (left <= frameRight && frameColInk[left] < minColInk) left++;
  if (left > frameRight) return null;
  let right = frameRight;
  while (right > left && frameColInk[right] < minColInk) right--;

  const bounds: ContentBounds = {
    left: Math.max(0, left / width - PADDING),
    top: Math.max(0, top / height - PADDING),
    right: Math.min(1, (right + 1) / width + PADDING),
    bottom: Math.min(1, (bottom + 1) / height + PADDING),
  };
  if (
    bounds.right - bounds.left < MIN_BOX_FRACTION ||
    bounds.bottom - bounds.top < MIN_BOX_FRACTION
  ) {
    return null;
  }
  return bounds;
}

/**
 * Content box of a two-page spread (both pages rendered at equal width,
 * left page occupying x 0..0.5, right page 0.5..1).
 */
export function combineSpreadBounds(
  first: ContentBounds | null,
  second: ContentBounds | null
): ContentBounds | null {
  if (!first || !second) return null;
  return {
    left: first.left / 2,
    right: 0.5 + second.right / 2,
    top: Math.min(first.top, second.top),
    bottom: Math.max(first.bottom, second.bottom),
  };
}
