// YouTube video ID parsing and validation

// YouTube video IDs are exactly 11 characters: letters, digits, - and _
const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;

export function isValidYouTubeVideoId(id: string): boolean {
  return VIDEO_ID_PATTERN.test(id);
}

/**
 * Extract a YouTube video ID from a URL or a bare ID.
 * Supports watch?v=..., youtu.be/..., shorts/..., embed/..., live/... URLs
 * (with or without protocol / www / mobile prefixes).
 * Returns null when no valid video ID can be found.
 */
export function extractYouTubeVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (isValidYouTubeVideoId(trimmed)) {
    return trimmed;
  }

  let url: URL;
  try {
    url = new URL(trimmed.includes('://') ? trimmed : `https://${trimmed}`);
  } catch {
    return null;
  }

  const hostname = url.hostname.replace(/^(www|m)\./, '');
  let candidate: string | null = null;

  if (hostname === 'youtu.be') {
    candidate = url.pathname.split('/').filter(Boolean)[0] ?? null;
  } else if (hostname === 'youtube.com' || hostname === 'music.youtube.com') {
    if (url.searchParams.has('v')) {
      candidate = url.searchParams.get('v');
    } else {
      const segments = url.pathname.split('/').filter(Boolean);
      if (segments.length >= 2 && ['shorts', 'embed', 'live', 'v'].includes(segments[0])) {
        candidate = segments[1];
      }
    }
  }

  return candidate && isValidYouTubeVideoId(candidate) ? candidate : null;
}
