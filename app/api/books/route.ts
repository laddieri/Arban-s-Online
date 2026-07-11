import { NextResponse } from 'next/server';
import { listBooksServer } from '@/lib/books/server';

// Public catalog of books (compiled-in + admin-uploaded), consumed by the
// client-side registry (lib/books/registry.ts).
export async function GET() {
  const books = await listBooksServer();
  return NextResponse.json(
    { books },
    {
      headers: {
        // Brief edge caching keeps this cheap; the admin UI busts it with a
        // query param after uploading a new book.
        'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
      },
    }
  );
}
