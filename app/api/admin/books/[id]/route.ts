import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/api';
import { books as staticBooks } from '@/config/books';
import { validateBookPayload } from '@/utils/bookValidation';
import { bookToRow, invalidateBooksCache, BookRow } from '@/lib/books/server';

// PATCH: update a runtime book's metadata/TOC. The id, image format, and
// page count come from the uploaded images and stay fixed; send the full
// updated metadata (title, shortTitle, pageOffset, minExercisePage,
// sections) - it is validated as a whole.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const { data: existing, error: fetchError } = await auth.supabase
    .from('books')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: 'Book not found' }, { status: 404 });
  }
  const row = existing as BookRow;

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  // Merge the editable fields over the stored row, then validate the result
  const result = validateBookPayload(
    {
      id: row.id,
      title: body.title ?? row.title,
      shortTitle: body.shortTitle ?? row.short_title,
      totalPages: row.total_pages,
      pageOffset: body.pageOffset ?? row.page_offset,
      minExercisePage: body.minExercisePage ?? row.min_exercise_page,
      imageFormat: row.image_format,
      sections: body.sections ?? row.sections,
    },
    staticBooks.map(b => b.id)
  );
  if ('error' in result) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  const { id: _id, image_prefix: _prefix, ...updates } = bookToRow(result.book);
  const { error } = await auth.supabase
    .from('books')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) {
    console.error('Failed to update book:', error);
    return NextResponse.json({ error: 'Failed to update book' }, { status: 500 });
  }

  invalidateBooksCache();
  return NextResponse.json({ message: 'Book updated' });
}

// DELETE: unregister a runtime book. Its images stay in R2 (harmless, and
// re-registering the same id picks them right back up).
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;
  const { id } = await params;

  const { error } = await auth.supabase.from('books').delete().eq('id', id);

  if (error) {
    console.error('Failed to delete book:', error);
    return NextResponse.json({ error: 'Failed to delete book' }, { status: 500 });
  }

  invalidateBooksCache();
  return NextResponse.json({ message: 'Book deleted' });
}
