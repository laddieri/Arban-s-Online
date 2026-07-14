import { describe, it, expect } from 'vitest';
import { findContentBounds, combineSpreadBounds } from '../contentBounds';

// Builds an RGBA buffer filled with `background` where `isInk(x, y)` pixels
// are painted near-black, mimicking a downscaled page scan.
function makeImage(
  width: number,
  height: number,
  isInk: (x: number, y: number) => boolean,
  background: [number, number, number] = [255, 255, 255]
): Uint8ClampedArray {
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = (y * width + x) * 4;
      const [r, g, b] = isInk(x, y) ? [20, 20, 20] : background;
      data[i] = r;
      data[i + 1] = g;
      data[i + 2] = b;
      data[i + 3] = 255;
    }
  }
  return data;
}

describe('findContentBounds', () => {
  it('returns null for a blank page', () => {
    expect(findContentBounds(makeImage(100, 130, () => false), 100, 130)).toBeNull();
  });

  it('finds the box around a block of music', () => {
    // Ink from x 20..79, y 30..89 on a 100x130 page
    const data = makeImage(100, 130, (x, y) => x >= 20 && x < 80 && y >= 30 && y < 90);
    const bounds = findContentBounds(data, 100, 130)!;
    expect(bounds).not.toBeNull();
    expect(bounds.left).toBeCloseTo(0.2 - 0.015, 2);
    expect(bounds.right).toBeCloseTo(0.8 + 0.015, 2);
    expect(bounds.top).toBeCloseTo(30 / 130 - 0.015, 2);
    expect(bounds.bottom).toBeCloseTo(90 / 130 + 0.015, 2);
  });

  it('ignores isolated specks outside the music', () => {
    const data = makeImage(
      100,
      130,
      (x, y) =>
        (x >= 20 && x < 80 && y >= 30 && y < 90) ||
        (x === 2 && y === 2) || // dust in the top-left margin
        (x === 97 && y === 127) // dust in the bottom-right margin
    );
    const bounds = findContentBounds(data, 100, 130)!;
    expect(bounds.left).toBeCloseTo(0.2 - 0.015, 2);
    expect(bounds.bottom).toBeCloseTo(90 / 130 + 0.015, 2);
  });

  it('does not mistake parchment-tinted paper for ink', () => {
    const data = makeImage(100, 130, () => false, [245, 234, 208]);
    expect(findContentBounds(data, 100, 130)).toBeNull();
  });

  it('clamps padding at the image edges', () => {
    const data = makeImage(100, 130, () => true);
    const bounds = findContentBounds(data, 100, 130)!;
    expect(bounds).toEqual({ left: 0, top: 0, right: 1, bottom: 1 });
  });

  it('rejects content too sparse to zoom to (title-only page)', () => {
    // A short centered title: 15% wide - fitting it would over-zoom wildly
    const data = makeImage(100, 130, (x, y) => x >= 43 && x < 58 && y >= 10 && y < 14);
    expect(findContentBounds(data, 100, 130)).toBeNull();
  });
});

describe('combineSpreadBounds', () => {
  it('maps two page boxes into spread coordinates', () => {
    const first = { left: 0.1, right: 0.9, top: 0.2, bottom: 0.8 };
    const second = { left: 0.15, right: 0.85, top: 0.1, bottom: 0.9 };
    expect(combineSpreadBounds(first, second)).toEqual({
      left: 0.05, // first page occupies x 0..0.5
      right: 0.5 + 0.425,
      top: 0.1,
      bottom: 0.9,
    });
  });

  it('gives up when either page is undetectable', () => {
    const box = { left: 0.1, right: 0.9, top: 0.2, bottom: 0.8 };
    expect(combineSpreadBounds(null, box)).toBeNull();
    expect(combineSpreadBounds(box, null)).toBeNull();
  });
});
