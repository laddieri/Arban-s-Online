import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isValidBookId, DEFAULT_BOOK_ID } from '@/config/books';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ page: string }> }
) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { videos: [], message: 'Video submission system not configured' },
        { status: 200 }
      );
    }

    const { page } = await params;
    const pageNumber = parseInt(page, 10);

    if (isNaN(pageNumber)) {
      return NextResponse.json(
        { error: 'Invalid page number' },
        { status: 400 }
      );
    }

    const bookParam = request.nextUrl.searchParams.get('book') ?? DEFAULT_BOOK_ID;
    if (!isValidBookId(bookParam)) {
      return NextResponse.json({ videos: [] });
    }

    const supabase = await createClient();

    const { data, error } = await supabase
      .from('video_submissions')
      .select('id, page_number, video_id, title, performer, description')
      .eq('page_number', pageNumber)
      .eq('book_id', bookParam)
      .eq('status', 'approved')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch videos' },
        { status: 500 }
      );
    }

    // Map database field names to ExerciseVideo interface
    const videos = (data || []).map((row: { video_id: string; title: string; performer?: string; description?: string }) => ({
      videoId: row.video_id,
      title: row.title,
      performer: row.performer,
      description: row.description,
    }));

    return NextResponse.json({ videos });
  } catch (error) {
    console.error('Error fetching videos:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
