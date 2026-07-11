'use client';

// In-browser PDF -> page-image conversion for the admin book uploader.
// pdf.js does the rendering on the admin's machine, so the server never
// touches PDF bytes and there are no serverless time/memory limits to hit.
// pdfjs-dist is ~1MB, so it is imported lazily and only on /admin/books.

import type { PDFDocumentProxy } from 'pdfjs-dist';

// The legacy build trades a little speed for much wider browser support:
// pdf.js v6's modern build needs bleeding-edge JS (e.g. Map.getOrInsertComputed)
// that older Safari/Chrome - the browsers admins actually use - may lack.

// Longest edge of the rendered page images. 2000px keeps sheet music
// crisp when zoomed while staying ~150-400KB per page as webp.
const TARGET_WIDTH = 2000;
const MAX_SCALE = 4;

export async function loadPdf(file: File): Promise<PDFDocumentProxy> {
  const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
  pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    'pdfjs-dist/legacy/build/pdf.worker.min.mjs',
    import.meta.url
  ).toString();
  const data = await file.arrayBuffer();
  return pdfjs.getDocument({ data }).promise;
}

/** webp encodes ~3x smaller than png but Safari can't always encode it */
export function detectWebpEncodeSupport(): boolean {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 1;
    return canvas.toDataURL('image/webp').startsWith('data:image/webp');
  } catch {
    return false;
  }
}

/** Render one page (1-based) to an image blob. */
export async function renderPageToBlob(
  doc: PDFDocumentProxy,
  pageNumber: number,
  format: 'webp' | 'png'
): Promise<Blob> {
  const page = await doc.getPage(pageNumber);
  try {
    const baseViewport = page.getViewport({ scale: 1 });
    const scale = Math.min(TARGET_WIDTH / baseViewport.width, MAX_SCALE);
    const viewport = page.getViewport({ scale });

    const canvas = document.createElement('canvas');
    canvas.width = Math.round(viewport.width);
    canvas.height = Math.round(viewport.height);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');

    // Scanned PDFs can carry transparency; flatten onto white like paper
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    await page.render({ canvasContext: ctx, viewport, canvas }).promise;

    const blob = await new Promise<Blob | null>(resolve =>
      canvas.toBlob(resolve, format === 'webp' ? 'image/webp' : 'image/png', 0.82)
    );
    // Free the canvas memory eagerly; large books render hundreds of these
    canvas.width = canvas.height = 0;
    if (!blob) throw new Error(`Page ${pageNumber}: image encoding failed`);
    return blob;
  } finally {
    page.cleanup();
  }
}
