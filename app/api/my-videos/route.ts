import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/api';
import { getBookServer } from '@/lib/books/server';
import { extractYouTubeVideoId } from '@/utils/youtube';
import { getMinPage } from '@/utils/pageFormat';
import { DEFAULT_BOOK_ID } from '@/config/books';

// Private practice recordings: YouTube links of the user's own playing,
// visible only to them (RLS-enforced). GET ?book=&page= lists a page's
// recordings; POST adds one; DELETE removes one.

export async function GET(request: NextRequest) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { supabase, user } = auth;

  const params = request.nextUrl.searchParams;
  const bookId = params.get('book') ?? DEFAULT_BOOK_ID;
  const page = parseInt(params.get('page') ?? '', 10);
  if (isNaN(page)) {
    return NextResponse.json({ error: 'Invalid page number' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_videos')
    .select('id, video_id, title, created_at')
    .eq('user_id', user.id)
    .eq('book_id', bookId)
    .eq('page_number', page)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to fetch recordings:', error);
    return NextResponse.json({ error: 'Failed to fetch recordings' }, { status: 500 });
  }

  return NextResponse.json({
    videos: (data ?? []).map(row => ({
      myVideoId: row.id,
      videoId: row.video_id,
      title: row.title || 'My recording',
      isPrivate: true,
    })),
  });
}

export async function POST(request: NextRequest) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { supabase, user } = auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const book = await getBookServer(body.book_id ?? DEFAULT_BOOK_ID);
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

  const title =
    typeof body.title === 'string' && body.title.trim().length > 0
      ? body.title.trim().slice(0, 200)
      : null;

  const { error } = await supabase.from('user_videos').insert({
    user_id: user.id,
    book_id: book.id,
    page_number: page,
    video_id: videoId,
    title,
  });

  if (error) {
    console.error('Failed to save recording:', error);
    return NextResponse.json({ error: 'Failed to save recording' }, { status: 500 });
  }

  return NextResponse.json({ message: 'Recording saved' }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const auth = await requireUser();
  if ('error' in auth) return auth.error;
  const { supabase, user } = auth;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { id } = body;
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Recording ID is required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('user_videos')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id)
    .select('id');

  if (error) {
    console.error('Failed to delete recording:', error);
    return NextResponse.json({ error: 'Failed to delete recording' }, { status: 500 });
  }
  if (!data || data.length === 0) {
    return NextResponse.json({ error: 'Recording not found' }, { status: 404 });
  }

  return NextResponse.json({ message: 'Recording deleted' });
}
