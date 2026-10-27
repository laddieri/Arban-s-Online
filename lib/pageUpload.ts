import type { PDFDocumentProxy } from 'pdfjs-dist';
import { renderPageToBlob } from './pdfConvert';

// How many page images upload in parallel. R2 handles far more, but the
// browser tab is also rendering pages; 3 keeps memory flat on big books.
const UPLOAD_CONCURRENCY = 3;
const UPLOAD_RETRIES = 3;

/**
 * Render every page of a PDF and PUT it to the bucket at
 * <bookId>/page-NNN.<format> via presigned URLs (admin-only endpoint).
 * Throws, before or after uploading, when the PDF evidently failed to
 * decode (pages render blank white), so a broken book is never registered.
 */
export async function uploadAllPages(
  doc: PDFDocumentProxy,
  bookId: string,
  format: 'webp' | 'png',
  onProgress: (done: number, total: number) => void
): Promise<void> {
  const total = doc.numPages;
  let done = 0;
  let blankCount = 0;
  let nextPage = 1;

  // Preflight: if the opening pages render blank white, the PDF's images
  // almost certainly failed to decode (unsupported codec) - stop before
  // spending minutes uploading a broken book.
  const first = await renderPageToBlob(doc, 1, format);
  const second = total > 1 ? await renderPageToBlob(doc, 2, format) : first;
  if (first.isBlank && second.isBlank) {
    throw new Error(
      'The first pages rendered completely blank, which usually means this ' +
        "PDF's images use a codec the browser could not decode. Nothing was " +
        'published. Try a different scan of the book (or report this PDF).'
    );
  }

  onProgress(0, total);

  const uploadOne = async (pageNumber: number) => {
    const { blob, isBlank } = await renderPageToBlob(doc, pageNumber, format);
    if (isBlank) blankCount++;
    for (let attempt = 1; ; attempt++) {
      try {
        const presign = await fetch('/api/admin/books/upload-url', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ bookId, pageIndex: pageNumber - 1, imageFormat: format }),
        });
        const presignData = await presign.json();
        if (!presign.ok) throw new Error(presignData.error || 'Failed to presign upload');
        const put = await fetch(presignData.url, {
          method: 'PUT',
          headers: { 'Content-Type': `image/${format}` },
          body: blob,
        });
        if (!put.ok) throw new Error(`Upload failed with HTTP ${put.status}`);
        return;
      } catch (err) {
        if (attempt >= UPLOAD_RETRIES) throw err;
        await new Promise(r => setTimeout(r, 1000 * attempt));
      }
    }
  };

  const worker = async () => {
    while (nextPage <= total) {
      const pageNumber = nextPage++;
      await uploadOne(pageNumber);
      done++;
      onProgress(done, total);
    }
  };

  await Promise.all(
    Array.from({ length: Math.min(UPLOAD_CONCURRENCY, total) }, worker)
  );

  if (blankCount === total) {
    throw new Error(
      'Every page rendered blank - this PDF could not be converted. ' +
        'The uploaded images should not be published; nothing was registered.'
    );
  }
}
