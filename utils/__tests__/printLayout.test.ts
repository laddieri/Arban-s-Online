import { describe, it, expect } from 'vitest';
import { computePrintPlacement, MAX_ENLARGEMENT } from '../printLayout';

const LETTER = [8.5, 11] as const;

describe('computePrintPlacement', () => {
  it('fills the width between equal side margins for a typical page', () => {
    // Scan 1000x1300 with music inset unevenly: 12% left, 6% right
    const p = computePrintPlacement(
      { left: 0.12, top: 0.08, right: 0.94, bottom: 0.9 },
      1000, 1300, ...LETTER, 0.5
    );
    expect(p.cropWidth).toBeCloseTo(7.5);
    expect(p.cropLeft).toBeCloseTo(0.5);
    expect(p.cropLeft + p.cropWidth).toBeCloseTo(8, 5);
    expect(p.cropHeight).toBeLessThanOrEqual(10 + 1e-9);
    // Centred vertically when the content fills most of the sheet
    expect(p.cropTop).toBeCloseTo((11 - p.cropHeight) / 2);
    // The scan is shifted so the content box's corner sits at the crop origin
    expect(p.imageLeft).toBeCloseTo(-0.12 * p.imageWidth);
    expect(p.imageTop).toBeCloseTo(-0.08 * p.imageHeight);
  });

  it('gives the same margins to scans with different paper borders', () => {
    const a = computePrintPlacement({ left: 0.05, top: 0.04, right: 0.95, bottom: 0.92 }, 1000, 1300, ...LETTER, 0.5);
    const b = computePrintPlacement({ left: 0.15, top: 0.1, right: 0.87, bottom: 0.8 }, 1000, 1300, ...LETTER, 0.5);
    expect(a.cropLeft).toBeCloseTo(0.5);
    expect(b.cropLeft).toBeCloseTo(0.5);
    expect(a.cropWidth).toBeCloseTo(b.cropWidth);
  });

  it('is limited by height for tall content', () => {
    const p = computePrintPlacement({ left: 0.3, top: 0, right: 0.7, bottom: 1 }, 1000, 1300, ...LETTER, 0.5);
    expect(p.cropHeight).toBeLessThanOrEqual(10 + 1e-9);
    expect(p.cropWidth).toBeLessThan(7.5);
    expect(p.cropLeft).toBeCloseTo((8.5 - p.cropWidth) / 2);
  });

  it('starts a partly-empty page at the top margin', () => {
    const p = computePrintPlacement({ left: 0.05, top: 0.05, right: 0.95, bottom: 0.4 }, 1000, 1300, ...LETTER, 0.5);
    expect(p.cropTop).toBeCloseTo(0.5);
  });

  it('caps enlargement of sparse pages', () => {
    const p = computePrintPlacement({ left: 0.4, top: 0.4, right: 0.6, bottom: 0.6 }, 1000, 1300, ...LETTER, 0.5);
    const wholeScan = Math.min(7.5 / 1000, 10 / 1300);
    expect(p.imageWidth / 1000).toBeCloseTo(wholeScan * MAX_ENLARGEMENT);
  });

  it('fits the whole scan inside the margins without a content box', () => {
    const p = computePrintPlacement(null, 1000, 1300, ...LETTER, 0.5);
    expect(p.imageLeft).toBeCloseTo(0);
    expect(p.cropWidth).toBeCloseTo(7.5);
    expect(p.cropHeight).toBeCloseTo(9.75);
  });
});
