import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/api';
import { books as staticBooks } from '@/config/books';
import { validateBookPayload } from '@/utils/bookValidation';
import { bookToRow, rowToBook, invalidateBooksCache, BookRow } from '@/lib/books/server';

// GET: runtime (admin-uploaded) books only - the admin UI manages these
export async function GET() {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from('books')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Failed to list books:', error);
    return NextResponse.json({ error: 'Failed to list books' }, { status: 500 });
  }

  return NextResponse.json({ books: (data as BookRow[]).map(rowToBook) });
}

// POST: register a new runtime book (called after its page images have
// been uploaded to R2 under the book's prefix)
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const result = validateBookPayload(body, staticBooks.map(b => b.id));
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { error } = await auth.supabase.from('books').insert(bookToRow(result.book));

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json(
        { error: `A book with id "${result.book.id}" already exists` },
        { status: 409 }
      );
    }
    console.error('Failed to create book:', error);
    return NextResponse.json({ error: 'Failed to create book' }, { status: 500 });
  }

  invalidateBooksCache();
  return NextResponse.json({ message: 'Book created' }, { status: 201 });
}
