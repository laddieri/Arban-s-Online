// Finds the bounding box of the printed music on a scanned page so the
// viewer can zoom past the white paper margins ("smart fullscreen").
// Pure pixel math - the browser-side image loading lives in lib/pageBounds.ts.

/** Edges of the page content as fractions of the image size (0..1). */
export interface ContentBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

// A pixel darker than this luminance counts as ink. Parchment-tinted paper
// (e.g. rgb(245,234,208), luminance ~234) must stay above it while grey
// staff lines from a downscaled scan stay below.
const INK_LUMINANCE = 220;

// A row/column needs a few ink pixels before it counts as content, so
// scanner dust and JPEG speckle don't stretch the box to the paper edge.
const MIN_INK_FRACTION = 0.005;

// Breathing room added around the detected box, as a fraction of the image.
const PADDING = 0.015;

// Sanity floor: a detected box narrower than this is a mostly-blank page
// (or noise) - zooming "to fit" it would be disorienting, so report nothing.
const MIN_BOX_FRACTION = 0.25;

/**
 * Bounding box of the dark content in an RGBA pixel buffer, or null when
 * the page is blank/too sparse to trust. Fractions of the image size.
 */
export function findContentBounds(
  data: Uint8ClampedArray,
  width: number,
  height: number
): ContentBounds | null {
  if (width < 4 || height < 4 || data.length < width * height * 4) return null;

  const rowInk = new Uint32Array(height);
  const colInk = new Uint32Array(width);
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      const i = row + x * 4;
      const luminance =
        0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      if (luminance < INK_LUMINANCE) {
        rowInk[y]++;
        colInk[x]++;
      }
    }
  }

  const minRowInk = Math.max(2, Math.round(width * MIN_INK_FRACTION));
  const minColInk = Math.max(2, Math.round(height * MIN_INK_FRACTION));

  let top = 0;
  while (top < height && rowInk[top] < minRowInk) top++;
  if (top === height) return null;
  let bottom = height - 1;
  while (bottom > top && rowInk[bottom] < minRowInk) bottom--;
  let left = 0;
  while (left < width && colInk[left] < minColInk) left++;
  if (left === width) return null;
  let right = width - 1;
  while (right > left && colInk[right] < minColInk) right--;

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
