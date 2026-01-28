import { NextRequest, NextResponse } from 'next/server';

// Proxy images through the app to avoid school filter issues
// Images will be served from /api/image/[page] instead of the external CDN

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

  // Validate page parameter (should be a 3-digit number like 001, 002, etc.)
  if (!/^\d{1,3}$/.test(page)) {
    return NextResponse.json(
      { error: 'Invalid page number' },
      { status: 400 }
    );
  }

  const paddedPage = page.padStart(3, '0');
  const imageUrl = `${imageBaseUrl}/page-${paddedPage}.${imageFormat}`;

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
