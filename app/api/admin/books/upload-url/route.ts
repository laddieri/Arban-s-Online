import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/supabase/api';
import { books as staticBooks } from '@/config/books';
import { BOOK_ID_PATTERN, IMAGE_FORMATS, MAX_TOTAL_PAGES } from '@/utils/bookValidation';
import { isR2Configured, presignPutUrl } from '@/lib/r2/presign';

// POST { bookId, pageIndex, imageFormat } -> { url }
// Presigns a PUT for one page image at <bookId>/page-NNN.<format>.
// Admin-only; keys are fully derived server-side so a compromised admin
// session still can't write outside a runtime book's own prefix.
export async function POST(request: NextRequest) {
  const auth = await requireAdmin();
  if ('error' in auth) return auth.error;

  if (!isR2Configured() && !process.env.TEST_UPLOAD_BASE_URL) {
    return NextResponse.json(
      { error: 'Uploads not configured: set the R2_* environment variables (see ADMIN_BOOKS.md)' },
      { status: 503 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { bookId, pageIndex, imageFormat } = body;

  if (typeof bookId !== 'string' || !BOOK_ID_PATTERN.test(bookId)) {
    return NextResponse.json({ error: 'Invalid book id' }, { status: 400 });
  }
  if (staticBooks.some(b => b.id === bookId)) {
    return NextResponse.json({ error: `"${bookId}" is a built-in book id` }, { status: 400 });
  }
  if (
    typeof pageIndex !== 'number' ||
    !Number.isInteger(pageIndex) ||
    pageIndex < 0 ||
    pageIndex >= MAX_TOTAL_PAGES
  ) {
    return NextResponse.json({ error: 'Invalid page index' }, { status: 400 });
  }
  if (typeof imageFormat !== 'string' || !IMAGE_FORMATS.includes(imageFormat as never)) {
    return NextResponse.json({ error: 'Invalid image format' }, { status: 400 });
  }

  const key = `${bookId}/page-${String(pageIndex).padStart(3, '0')}.${imageFormat}`;
  const url = await presignPutUrl(key);
  return NextResponse.json({ url });
}
