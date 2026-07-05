import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/api';
import { extractYouTubeVideoId } from '@/utils/youtube';

export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { supabase, user } = auth;

    const body = await request.json();
    const { page_number, video_id, title, performer, description } = body;

    // Validation
    if (page_number === undefined || !video_id || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: page_number, video_id, title' },
        { status: 400 }
      );
    }

    // Preface pages are negative internal page numbers (down to -pageOffset)
    const totalPages = parseInt(process.env.NEXT_PUBLIC_TOTAL_PAGES || '347');
    const pageOffset = parseInt(process.env.NEXT_PUBLIC_PAGE_OFFSET || '7');
    if (
      typeof page_number !== 'number' ||
      !Number.isInteger(page_number) ||
      page_number < -pageOffset ||
      page_number > totalPages
    ) {
      return NextResponse.json(
        { error: 'Invalid page number' },
        { status: 400 }
      );
    }

    if (typeof title !== 'string' || title.trim().length === 0 || title.trim().length > 200) {
      return NextResponse.json(
        { error: 'Title must be a string with maximum 200 characters' },
        { status: 400 }
      );
    }

    if (performer !== undefined && performer !== null &&
        (typeof performer !== 'string' || performer.length > 200)) {
      return NextResponse.json(
        { error: 'Performer must be a string with maximum 200 characters' },
        { status: 400 }
      );
    }

    if (description !== undefined && description !== null &&
        (typeof description !== 'string' || description.length > 1000)) {
      return NextResponse.json(
        { error: 'Description must be a string with maximum 1000 characters' },
        { status: 400 }
      );
    }

    // Extract and validate the video ID from various YouTube URL formats
    const cleanVideoId = typeof video_id === 'string' ? extractYouTubeVideoId(video_id) : null;
    if (!cleanVideoId) {
      return NextResponse.json(
        { error: 'Invalid YouTube video URL or ID' },
        { status: 400 }
      );
    }

    // Insert submission
    const { data, error } = await supabase
      .from('video_submissions')
      .insert({
        page_number,
        video_id: cleanVideoId,
        title: title.trim(),
        performer: performer?.trim() || null,
        description: description?.trim() || null,
        submitted_by: user.id,
        status: 'pending',
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to submit video' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Video submitted successfully. It will appear after approval.',
      submission: data,
    });
  } catch (error) {
    console.error('Error submitting video:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
