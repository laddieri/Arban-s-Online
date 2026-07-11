import { NextRequest, NextResponse } from 'next/server';
import { isSupabaseConfigured } from '@/lib/supabase/api';
import { createClient } from '@/lib/supabase/server';

const MAX_LIMIT = 50;
const DEFAULT_LIMIT = 24;

// GET /api/videos/recent - newest approved community video submissions,
// across all books. Public: the RLS policy already exposes approved rows
// to everyone, this just orders them for the /videos page.
export async function GET(request: NextRequest) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ videos: [] });
  }

  const limitParam = parseInt(request.nextUrl.searchParams.get('limit') ?? '', 10);
  const limit = isNaN(limitParam)
    ? DEFAULT_LIMIT
    : Math.min(Math.max(limitParam, 1), MAX_LIMIT);

  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from('video_submissions')
      .select('id, page_number, book_id, video_id, title, performer, reviewed_at, created_at')
      .eq('status', 'approved')
      .order('reviewed_at', { ascending: false, nullsFirst: false })
      .limit(limit);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch videos' }, { status: 500 });
    }

    const videos = (data ?? []).map(row => ({
      id: row.id,
      videoId: row.video_id,
      title: row.title,
      performer: row.performer,
      page: row.page_number,
      book: row.book_id ?? 'arban',
      // When the submission was approved (fall back for pre-trigger rows)
      addedAt: row.reviewed_at ?? row.created_at,
    }));

    return NextResponse.json(
      { videos },
      // Light edge caching: this list changes only when an admin approves
      { headers: { 'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600' } }
    );
  } catch (err) {
    console.error('Error fetching recent videos:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
