import { NextRequest, NextResponse } from 'next/server';
import { getBook, isValidBookId, DEFAULT_BOOK_ID } from '@/config/books';

// Proxy images through the app to avoid school filter issues
// Images will be served from /api/image/[page]?book=<id> instead of the external CDN

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ page: string }> }
) {
  const { page } = await params;

  const imageBaseUrl = process.env.NEXT_PUBLIC_IMAGE_BASE_URL;
  const imageFormat = process.env.NEXT_PUBLIC_IMAGE_FORMAT || 'webp';

  if (!imageBaseUrl) {
    return NextResponse.json(
      { error: 'Image base URL not configured' },
      { status: 500 }
    );
  }

  const bookParam = request.nextUrl.searchParams.get('book') ?? DEFAULT_BOOK_ID;
  if (!isValidBookId(bookParam)) {
    return NextResponse.json({ error: 'Unknown book' }, { status: 404 });
  }
  const book = getBook(bookParam);

  // Validate page parameter (image file number, offset already applied)
  if (!/^\d{1,3}$/.test(page)) {
    return NextResponse.json(
      { error: 'Invalid page number' },
      { status: 400 }
    );
  }

  const maxImagePageNum = book.totalPages + book.pageOffset;
  const pageNum = parseInt(page);
  if (pageNum < 0 || pageNum > maxImagePageNum) {
    return NextResponse.json(
      { error: 'Page number out of range' },
      { status: 404 }
    );
  }

  const paddedPage = page.padStart(3, '0');
  const prefix = book.imagePrefix ? `${book.imagePrefix}/` : '';
  const imageUrl = `${imageBaseUrl}/${prefix}page-${paddedPage}.${imageFormat}`;

  try {
    const response = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Arban-Online-Viewer/1.0',
      },
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: 'Image not found' },
        { status: response.status }
      );
    }

    const imageBuffer = await response.arrayBuffer();

    // Determine content type based on format
    const contentTypeMap: Record<string, string> = {
      'webp': 'image/webp',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
    };
    const contentType = contentTypeMap[imageFormat] || 'image/webp';

    return new NextResponse(imageBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'X-Content-Type-Options': 'nosniff',
      },
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}
