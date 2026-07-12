'use client';

// Sweeps a book's page images through the image proxy and reports pages
// that are missing (HTTP error) or blank (near-white - e.g. a codec
// failure during upload). Runs in the admin's browser; R2 egress is free
// and the proxy responses are edge-cached, so a full sweep costs nothing.

import type { Book } from '@/config/books';

const CONCURRENCY = 6;
const SAMPLE_WIDTH = 200;
const NEAR_WHITE = 240;

export interface AuditProgress {
  done: number;
  total: number;
}

export interface AuditController {
  cancelled: boolean;
}

export interface AuditResult {
  checked: number;
  /** Display page numbers whose image failed to load */
  missing: number[];
  /** Display page numbers whose image is uniformly near-white */
  blank: number[];
}

async function isBlankImage(blob: Blob): Promise<boolean> {
  const bitmap = await createImageBitmap(blob);
  const scale = SAMPLE_WIDTH / bitmap.width;
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_WIDTH;
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < data.length; i += 4) {
    if (data[i] < NEAR_WHITE || data[i + 1] < NEAR_WHITE || data[i + 2] < NEAR_WHITE) {
      return false;
    }
  }
  return true;
}

/** Check every page image of a book. Image file n maps to display page n - pageOffset. */
export async function auditBookImages(
  book: Book,
  onProgress: (p: AuditProgress) => void,
  controller: AuditController
): Promise<AuditResult> {
  const maxImageIndex = book.totalPages + book.pageOffset;
  const indices = Array.from({ length: maxImageIndex + 1 }, (_, i) => i);
  const missing: number[] = [];
  const blank: number[] = [];
  let done = 0;
  let cursor = 0;

  const worker = async () => {
    while (cursor < indices.length && !controller.cancelled) {
      const imageIndex = indices[cursor++];
      const displayPage = imageIndex - book.pageOffset;
      const padded = String(imageIndex).padStart(3, '0');
      try {
        const res = await fetch(`/api/image/${padded}?book=${book.id}`);
        if (!res.ok) {
          missing.push(displayPage);
        } else if (await isBlankImage(await res.blob())) {
          blank.push(displayPage);
        }
      } catch {
        missing.push(displayPage);
      }
      done++;
      onProgress({ done, total: indices.length });
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, indices.length) }, worker)
  );

  missing.sort((a, b) => a - b);
  blank.sort((a, b) => a - b);
  return { checked: done, missing, blank };
}
