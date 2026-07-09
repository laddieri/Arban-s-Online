import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/api';
import { isValidBookId, DEFAULT_BOOK_ID } from '@/config/books';

// GET - List all favorites for the current user
export async function GET(request: NextRequest) {
  try {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { supabase, user } = auth;

    // Get all favorites for the user
    const { data, error } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to fetch favorites' },
        { status: 500 }
      );
    }

    return NextResponse.json({ favorites: data });
  } catch (error) {
    console.error('Error fetching favorites:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Add a favorite
export async function POST(request: NextRequest) {
  try {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { supabase, user } = auth;

    const body = await request.json();
    const { page_number } = body;

    // Validation
    if (!page_number || typeof page_number !== 'number') {
      return NextResponse.json(
        { error: 'Invalid page number' },
        { status: 400 }
      );
    }

    const bookId = body.book_id ?? DEFAULT_BOOK_ID;
    if (typeof bookId !== 'string' || !isValidBookId(bookId)) {
      return NextResponse.json({ error: 'Unknown book' }, { status: 400 });
    }

    // Insert favorite (will fail if duplicate due to unique constraint)
    const { data, error } = await supabase
      .from('user_favorites')
      .insert({
        user_id: user.id,
        page_number,
        book_id: bookId,
      })
      .select()
      .single();

    if (error) {
      // Check for duplicate error
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'Page is already in favorites' },
          { status: 409 }
        );
      }
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to add favorite' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Page added to favorites',
      favorite: data,
    });
  } catch (error) {
    console.error('Error adding favorite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Remove a favorite
export async function DELETE(request: NextRequest) {
  try {
    const auth = await requireUser();
    if ('error' in auth) return auth.error;
    const { supabase, user } = auth;

    const body = await request.json();
    const { page_number } = body;

    // Validation
    if (!page_number || typeof page_number !== 'number') {
      return NextResponse.json(
        { error: 'Invalid page number' },
        { status: 400 }
      );
    }

    const deleteBookId = body.book_id ?? DEFAULT_BOOK_ID;
    if (typeof deleteBookId !== 'string' || !isValidBookId(deleteBookId)) {
      return NextResponse.json({ error: 'Unknown book' }, { status: 400 });
    }

    // Delete favorite
    const { error } = await supabase
      .from('user_favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('book_id', deleteBookId)
      .eq('page_number', page_number);

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { error: 'Failed to remove favorite' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Page removed from favorites',
    });
  } catch (error) {
    console.error('Error removing favorite:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
