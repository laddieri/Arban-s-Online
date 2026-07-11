import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/api';
import { getBookServer } from '@/lib/books/server';
import { extractYouTubeVideoId } from '@/utils/youtube';
import { getMinPage } from '@/utils/pageFormat';

// POST /api/admin/videos - attach a video to a page as already-approved
// (used by the admin "find videos" search; community submissions still go
// through /api/videos/submit and the review queue).
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { supabase, user } = auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const book = await getBookServer(body.book_id);
  if (!book) {
    return NextResponse.json({ error: 'Unknown book' }, { status: 400 });
  }

  const page = body.page_number;
  if (
    typeof page !== 'number' ||
    !Number.isInteger(page) ||
    page < getMinPage(book.pageOffset) ||
    page > book.totalPages
  ) {
    return NextResponse.json({ error: 'Invalid page number' }, { status: 400 });
  }

  const videoId = typeof body.video_id === 'string' ? extractYouTubeVideoId(body.video_id) : null;
  if (!videoId) {
    return NextResponse.json({ error: 'Invalid YouTube video URL or ID' }, { status: 400 });
  }

  const title = typeof body.title === 'string' ? body.title.trim() : '';
  if (title.length === 0 || title.length > 200) {
    return NextResponse.json({ error: 'Title must be 1-200 characters' }, { status: 400 });
  }

  const performer =
    typeof body.performer === 'string' && body.performer.trim().length > 0
      ? body.performer.trim().slice(0, 200)
      : null;

  // The same video twice on one page would just clutter the overlay
  const { data: existing } = await supabase
    .from('video_submissions')
    .select('id')
    .eq('book_id', book.id)
    .eq('page_number', page)
    .eq('video_id', videoId)
    .eq('status', 'approved')
    .limit(1);
  if (existing && existing.length > 0) {
    return NextResponse.json(
      { error: 'That video is already attached to this page' },
      { status: 409 }
    );
  }

  const { error } = await supabase.from('video_submissions').insert({
    book_id: book.id,
    page_number: page,
    video_id: videoId,
    title,
    performer,
    submitted_by: user.id,
    status: 'approved',
    reviewed_by: user.id,
    reviewed_at: new Date().toISOString(),
  });

  if (error) {
    console.error('Failed to attach video:', error);
    return NextResponse.json({ error: 'Failed to attach video' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Video attached' }, { status: 201 });
}
