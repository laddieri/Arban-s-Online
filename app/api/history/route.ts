import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/api';
import { DEFAULT_BOOK_ID } from '@/config/books';
import { isValidBookIdServer } from '@/lib/books/server';

// GET - List page history for the current user
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { supabase, user } = auth;

    // Get all history for the user (last 500 entries)
    const { data, error } = await supabase
      .from('page_history')
      .select('*')
      .eq('user_id', user.id)
      .order('viewed_at', { ascending: false })
      .limit(500);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch history' },
        { status: 500 }
      );
    }

    return NextResponse.json({ history: data });
  } catch (error) {
    console.error('Error fetching history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a page view to history
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { supabase, user } = auth;

    const body = await request.json();
    const { page_number } = body;

    // Validation
    if (page_number === undefined || typeof page_number !== 'number') {
      return NextResponse.json(
        { error: 'Invalid page number' },
        { status: 400 }
      );
    }

    const bookId = body.book_id ?? DEFAULT_BOOK_ID;
    if (typeof bookId !== 'string' || !(await isValidBookIdServer(bookId))) {
      return NextResponse.json({ error: 'Unknown book' }, { status: 400 });
    }

    // Check if the same page was viewed in the last minute (avoid duplicates)
    const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
    const { data: recentViews } = await supabase
      .from('page_history')
      .select('*')
      .eq('user_id', user.id)
      .eq('page_number', page_number)
      .eq('book_id', bookId)
      .gte('viewed_at', oneMinuteAgo)
      .limit(1);

    if (recentViews && recentViews.length > 0) {
      // Don't add duplicate entry within 1 minute
      return NextResponse.json({
        message: 'Page view already recorded recently',
      });
    }

    // Insert history entry
    const { data, error } = await supabase
      .from('page_history')
      .insert({
        user_id: user.id,
        page_number,
        book_id: bookId,
      })
      .select()
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to add page to history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Page view recorded',
      history: data,
    });
  } catch (error) {
    console.error('Error adding to history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Clear all history for the current user
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { supabase, user } = auth;

    // Delete all history for the user
    const { error } = await supabase
      .from('page_history')
      .delete()
      .eq('user_id', user.id);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to clear history' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'History cleared',
    });
  } catch (error) {
    console.error('Error clearing history:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
