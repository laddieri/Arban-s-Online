'use client';

// Client-side content-bounds lookup for page images: loads the image,
// downscales it onto a canvas and finds the printed music's bounding box
// (utils/contentBounds.ts). Results are cached per URL for the session.
//
// Reading pixels requires a CORS-clean image, so the CDN copy is loaded
// with crossOrigin=anonymous. If the bucket doesn't allow cross-origin
// GETs the load fails and the same-origin /api/image proxy is tried
// instead; if that also fails the caller simply skips the smart fit.

import { findContentBounds, type ContentBounds } from '@/utils/contentBounds';

const SAMPLE_WIDTH = 256;

const cache = new Map<string, Promise<ContentBounds | null>>();

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${url}`));
    img.src = url;
  });
}

function measure(img: HTMLImageElement): ContentBounds | null {
  if (!img.naturalWidth || !img.naturalHeight) return null;
  const canvas = document.createElement('canvas');
  canvas.width = SAMPLE_WIDTH;
  canvas.height = Math.max(
    1,
    Math.round((img.naturalHeight / img.naturalWidth) * SAMPLE_WIDTH)
  );
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  return findContentBounds(data, canvas.width, canvas.height);
}

/**
 * Content bounds of the page image at `url`, falling back to
 * `fallbackUrl` (the same-origin image proxy) when the direct load is
 * blocked by CORS. Never rejects - unreadable images resolve to null.
 */
export function getPageContentBounds(
  url: string,
  fallbackUrl?: string
): Promise<ContentBounds | null> {
  let pending = cache.get(url);
  if (!pending) {
    pending = (async () => {
      try {
        return measure(await loadImage(url));
      } catch {
        if (fallbackUrl && fallbackUrl !== url) {
          try {
            return measure(await loadImage(fallbackUrl));
          } catch {
            return null;
          }
        }
        return null;
      }
    })();
    cache.set(url, pending);
  }
  return pending;
}
