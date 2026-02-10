import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: NextRequest) {
  try {
    // Check if Supabase is configured
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: 'Video submission system not configured. Please contact the administrator.' },
        { status: 503 }
      );
    }

    const supabase = await createClient();

    // Check authentication
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { page_number, video_id, title, performer, description } = body;

    // Validation
    if (!page_number || !video_id || !title) {
      return NextResponse.json(
        { error: 'Missing required fields: page_number, video_id, title' },
        { status: 400 }
      );
    }

    if (typeof page_number !== 'number' || page_number < 1) {
      return NextResponse.json(
        { error: 'Invalid page number' },
        { status: 400 }
      );
    }

    // Extract video ID from various YouTube URL formats
    let cleanVideoId = video_id;
    try {
      const url = new URL(video_id.startsWith('http') ? video_id : `https://youtube.com/watch?v=${video_id}`);
      if (url.hostname.includes('youtube.com')) {
        cleanVideoId = url.searchParams.get('v') || video_id;
      } else if (url.hostname.includes('youtu.be')) {
        cleanVideoId = url.pathname.substring(1).split('?')[0];
      }
    } catch {
      // If URL parsing fails, assume it's already a video ID
    }

    // Remove any query parameters from video ID
    cleanVideoId = cleanVideoId.split('?')[0].split('&')[0];

    // Insert submission
    const { data, error } = await supabase
      .from('video_submissions')
      .insert({
        page_number,
        video_id: cleanVideoId,
        title,
        performer: performer || null,
        description: description || null,
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
