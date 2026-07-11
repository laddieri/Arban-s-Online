'use client';

// Scans a book's pages for headings to pre-fill the admin TOC editor.
// Two sources, both fully in-browser:
//  1. The PDF's text layer (instant, used when the PDF has one)
//  2. OCR of the top strip of each page image via tesseract.js, with the
//     worker/wasm/language data self-hosted under public/ocr/
// The heading -> suggestion heuristics live in utils/tocSuggestions.ts.

import type { PDFDocumentProxy } from 'pdfjs-dist';
import type { Worker as TesseractWorker } from 'tesseract.js';
import { PageHeading, TocSuggestion, buildTocSuggestions } from '@/utils/tocSuggestions';

// Titles sit in the top band of a page of sheet music. A quarter of the
// page is generous enough for headings pushed down by ornaments/numbers
// while still excluding most of the music itself.
const STRIP_RATIO = 0.25;
const STRIP_RENDER_WIDTH = 1200;
const PREVIEW_WIDTH = 480;

export interface SuggestProgress {
  done: number;
  total: number;
}

export interface SuggestController {
  cancelled: boolean;
}

async function createOcrWorker(): Promise<TesseractWorker> {
  const { createWorker } = await import('tesseract.js');
  return createWorker('eng', 1, {
    workerPath: '/ocr/worker.min.js',
    corePath: '/ocr/',
    langPath: '/ocr/',
    gzip: true,
  });
}

function stripPreview(canvas: HTMLCanvasElement): string {
  const scale = PREVIEW_WIDTH / canvas.width;
  const preview = document.createElement('canvas');
  preview.width = PREVIEW_WIDTH;
  preview.height = Math.max(1, Math.round(canvas.height * scale));
  preview.getContext('2d')!.drawImage(canvas, 0, 0, preview.width, preview.height);
  return preview.toDataURL('image/jpeg', 0.6);
}

async function ocrCanvas(worker: TesseractWorker, canvas: HTMLCanvasElement): Promise<string> {
  const { data } = await worker.recognize(canvas);
  return data.text ?? '';
}

/** Heading text from the PDF text layer's top band; null = no text layer. */
async function textLayerHeading(doc: PDFDocumentProxy, pageNumber: number): Promise<string | null> {
  const page = await doc.getPage(pageNumber);
  try {
    const viewport = page.getViewport({ scale: 1 });
    const content = await page.getTextContent();
    const items = content.items as { str: string; transform: number[] }[];
    if (items.length === 0) return null; // scanned page, no text layer
    // PDF y-axis is bottom-up: the top band is the highest y values
    const topBand = items.filter(i => i.transform[5] >= viewport.height * (1 - STRIP_RATIO));
    return topBand
      .sort((a, b) => b.transform[5] - a.transform[5] || a.transform[4] - b.transform[4])
      .map(i => i.str)
      .join(' ');
  } finally {
    page.cleanup();
  }
}

/** Render the top strip of a PDF page to a canvas (for OCR + preview). */
async function renderPdfStrip(doc: PDFDocumentProxy, pageNumber: number): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNumber);
  try {
    const base = page.getViewport({ scale: 1 });
    const scale = STRIP_RENDER_WIDTH / base.width;
    const viewport = page.getViewport({ scale });
    const full = document.createElement('canvas');
    full.width = Math.round(viewport.width);
    full.height = Math.round(viewport.height);
    const ctx = full.getContext('2d')!;
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, full.width, full.height);
    await page.render({ canvasContext: ctx, viewport, canvas: full }).promise;

    const strip = document.createElement('canvas');
    strip.width = full.width;
    strip.height = Math.round(full.height * STRIP_RATIO);
    strip.getContext('2d')!.drawImage(full, 0, 0);
    full.width = full.height = 0;
    return strip;
  } finally {
    page.cleanup();
  }
}

/** Top strip of an already-uploaded page image (edit mode). */
async function imageStrip(url: string): Promise<HTMLCanvasElement | null> {
  const res = await fetch(url);
  if (!res.ok) return null;
  const bitmap = await createImageBitmap(await res.blob());
  const scale = STRIP_RENDER_WIDTH / bitmap.width;
  const strip = document.createElement('canvas');
  strip.width = STRIP_RENDER_WIDTH;
  strip.height = Math.max(1, Math.round(bitmap.height * STRIP_RATIO * scale));
  strip
    .getContext('2d')!
    .drawImage(bitmap, 0, 0, bitmap.width, bitmap.height * STRIP_RATIO, 0, 0, strip.width, strip.height);
  bitmap.close();
  return strip;
}

/**
 * Suggest TOC entries for a PDF (create mode). Uses the text layer when
 * present; otherwise OCRs each page's top strip. displayPage for PDF page
 * p (1-based) is p - 1 - pageOffset (image index p-1, display = index - offset).
 */
export async function suggestTocFromPdf(
  doc: PDFDocumentProxy,
  pageOffset: number,
  onProgress: (p: SuggestProgress) => void,
  controller: SuggestController
): Promise<TocSuggestion[]> {
  const total = doc.numPages;
  const headings: PageHeading[] = [];
  let worker: TesseractWorker | null = null;

  try {
    for (let p = 1; p <= total; p++) {
      if (controller.cancelled) break;
      const displayPage = p - 1 - pageOffset;
      const fromText = await textLayerHeading(doc, p);
      if (fromText !== null) {
        headings.push({ page: displayPage, text: fromText });
      } else {
        const strip = await renderPdfStrip(doc, p);
        worker ??= await createOcrWorker();
        const text = await ocrCanvas(worker, strip);
        headings.push({ page: displayPage, text, preview: stripPreview(strip) });
        strip.width = strip.height = 0;
      }
      onProgress({ done: p, total });
    }
  } finally {
    await worker?.terminate();
  }

  return buildTocSuggestions(headings);
}

/**
 * Suggest TOC entries from already-uploaded page images (edit mode).
 * pages: display page numbers with their image URLs.
 */
export async function suggestTocFromImages(
  pages: { displayPage: number; url: string }[],
  onProgress: (p: SuggestProgress) => void,
  controller: SuggestController
): Promise<TocSuggestion[]> {
  const headings: PageHeading[] = [];
  let worker: TesseractWorker | null = null;
  let done = 0;

  try {
    for (const { displayPage, url } of pages) {
      if (controller.cancelled) break;
      const strip = await imageStrip(url);
      if (strip) {
        worker ??= await createOcrWorker();
        const text = await ocrCanvas(worker, strip);
        headings.push({ page: displayPage, text, preview: stripPreview(strip) });
        strip.width = strip.height = 0;
      }
      done++;
      onProgress({ done, total: pages.length });
    }
  } finally {
    await worker?.terminate();
  }

  return buildTocSuggestions(headings);
}
