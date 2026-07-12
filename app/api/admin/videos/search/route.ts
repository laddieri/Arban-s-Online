import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/api';
import { getBookServer } from '@/lib/books/server';
import { buildVideoSearchQuery } from '@/utils/videoQuery';
import { getMinPage } from '@/utils/pageFormat';

// GET /api/admin/videos/search?book=&page=[&q=]
// Searches YouTube (Data API v3) for performance videos of the given page's
// exercise. Admin-only; the default query comes from the book's TOC and can
// be overridden with q. Requires the YOUTUBE_API_KEY env var (see
// ADMIN_BOOKS.md). Each call costs 100 of the key's 10,000 free daily units.

// YouTube snippet fields arrive HTML-escaped
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Video search not configured: set the YOUTUBE_API_KEY environment variable (see ADMIN_BOOKS.md)' },
      { status: 503 }
    );
  }

  const params = request.nextUrl.searchParams;
  const book = await getBookServer(params.get('book'));
  if (!book) {
    return NextResponse.json({ error: 'Unknown book' }, { status: 400 });
  }
  const page = parseInt(params.get('page') ?? '', 10);
  if (isNaN(page) || page < getMinPage(book.pageOffset) || page > book.totalPages) {
    return NextResponse.json({ error: 'Invalid page number' }, { status: 400 });
  }

  const override = params.get('q')?.trim();
  const query = override && override.length > 0 ? override.slice(0, 200) : buildVideoSearchQuery(book, page);

  const url = new URL('https://www.googleapis.com/youtube/v3/search');
  url.searchParams.set('part', 'snippet');
  url.searchParams.set('type', 'video');
  url.searchParams.set('videoEmbeddable', 'true');
  url.searchParams.set('maxResults', '8');
  url.searchParams.set('q', query);
  url.searchParams.set('key', apiKey);

  try {
    const res = await fetch(url);
    const data = await res.json();
    if (!res.ok) {
      const reason = data?.error?.message ?? `YouTube API error (HTTP ${res.status})`;
      console.error('YouTube search failed:', reason);
      return NextResponse.json({ error: reason }, { status: 502 });
    }

    const results = (data.items ?? [])
      .filter((item: any) => item?.id?.videoId)
      .map((item: any) => ({
        videoId: item.id.videoId,
        title: decodeEntities(item.snippet?.title ?? ''),
        channel: decodeEntities(item.snippet?.channelTitle ?? ''),
        thumbnail: item.snippet?.thumbnails?.medium?.url ?? null,
        publishedAt: item.snippet?.publishedAt ?? null,
      }));

    return NextResponse.json({ query, results });
  } catch (err) {
    console.error('YouTube search failed:', err);
    return NextResponse.json({ error: 'Failed to reach YouTube' }, { status: 502 });
  }
}
