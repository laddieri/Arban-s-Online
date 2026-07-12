import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/api';
import { classifyVideoHealth, YouTubeVideoStatusItem } from '@/utils/videoHealth';

// GET /api/admin/videos/health - checks every approved video against the
// YouTube Data API and reports the ones that no longer play: deleted,
// private, or embedding disabled. videos.list costs 1 quota unit per call
// of up to 50 ids, so even a large library is nearly free to check.

const BATCH_SIZE = 50;

export async function GET(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const apiKey = process.env.YOUTUBE_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: 'Video check not configured: set the YOUTUBE_API_KEY environment variable (see ADMIN_BOOKS.md)' },
      { status: 503 }
    );
  }

  const { data: submissions, error } = await auth.supabase
    .from('video_submissions')
    .select('id, video_id, title, book_id, page_number')
    .eq('status', 'approved');

  if (error) {
    console.error('Failed to list approved videos:', error);
    return NextResponse.json({ error: 'Failed to list approved videos' }, { status: 500 });
  }

  const uniqueIds = [...new Set((submissions ?? []).map(s => s.video_id))];
  const items: YouTubeVideoStatusItem[] = [];

  try {
    for (let i = 0; i < uniqueIds.length; i += BATCH_SIZE) {
      const batch = uniqueIds.slice(i, i + BATCH_SIZE);
      const url = new URL('https://www.googleapis.com/youtube/v3/videos');
      url.searchParams.set('part', 'status');
      url.searchParams.set('id', batch.join(','));
      url.searchParams.set('maxResults', String(BATCH_SIZE));
      url.searchParams.set('key', apiKey);
      const res = await fetch(url, {
        headers: { Referer: `${request.nextUrl.origin}/` },
      });
      const data = await res.json();
      if (!res.ok) {
        const reason = data?.error?.message ?? `YouTube API error (HTTP ${res.status})`;
        return NextResponse.json({ error: reason }, { status: 502 });
      }
      items.push(...(data.items ?? []));
    }
  } catch (err) {
    console.error('Video health check failed:', err);
    return NextResponse.json({ error: 'Failed to reach YouTube' }, { status: 502 });
  }

  const problemsById = classifyVideoHealth(uniqueIds, items);
  const problems = (submissions ?? [])
    .filter(s => problemsById.has(s.video_id))
    .map(s => ({
      id: s.id,
      videoId: s.video_id,
      title: s.title,
      book: s.book_id ?? 'arban',
      page: s.page_number,
      problem: problemsById.get(s.video_id)!,
    }));

  return NextResponse.json({
    checked: uniqueIds.length,
    submissions: (submissions ?? []).length,
    problems,
  });
}
