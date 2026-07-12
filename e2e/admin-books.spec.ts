import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

// End-to-end test of the admin book uploader: a real PDF is converted with
// pdf.js in the browser and each page is PUT to the local image server
// (standing in for R2 presigned URLs). The admin/auth API routes are mocked
// at the network layer - the e2e build has no Supabase - so what's under
// test is the whole client pipeline plus the URL contract, not RLS.

const TEST_PDF = path.join(__dirname, '.test-images', 'test-book.pdf');
const UPLOAD_SLUG = 'zzz-upload-test';
const UPLOAD_DIR = path.join(__dirname, '.test-images', UPLOAD_SLUG);

test('admin converts and uploads a PDF book', async ({ page }) => {
  test.setTimeout(120_000); // rendering + uploading 5 pages takes a while in CI
  fs.rmSync(UPLOAD_DIR, { recursive: true, force: true });
  let registered: Record<string, unknown> | null = null;

  await page.route('**/api/admin/books', route => {
    if (route.request().method() === 'GET') {
      return route.fulfill({ json: { books: [] } });
    }
    registered = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { message: 'Book created' } });
  });
  await page.route('**/api/admin/books/upload-url', route => {
    const { bookId, pageIndex, imageFormat } = route.request().postDataJSON();
    const key = `${bookId}/page-${String(pageIndex).padStart(3, '0')}.${imageFormat}`;
    return route.fulfill({ json: { url: `http://localhost:8080/${key}` } });
  });

  await page.goto('/admin/books');
  await expect(page.getByText('Add a book')).toBeVisible();

  await page.setInputFiles('[data-testid="pdf-input"]', TEST_PDF);
  await page.getByPlaceholder('Clarke — Technical Studies for the Cornet').fill('ZZZ Upload Test');
  await page.getByPlaceholder('Clarke Studies').fill('ZZZ Test');
  // The slug auto-fills from the title
  await expect(page.getByPlaceholder('clarke', { exact: true })).toHaveValue(UPLOAD_SLUG);

  // Add a TOC entry
  await page.getByRole('button', { name: '+ Add entry' }).click();
  await page.getByPlaceholder('Study No. 1').fill('First Study');
  await page.getByPlaceholder('Page', { exact: true }).fill('2');

  await page.getByRole('button', { name: 'Convert & upload' }).click();
  await expect(page.locator('[data-testid="upload-done"]')).toBeVisible({ timeout: 90_000 });

  // The registration payload reflects the real PDF geometry
  expect(registered).not.toBeNull();
  const reg = registered! as {
    id: string;
    imageCount: number;
    imageFormat: string;
    pageOffset: number;
    sections: { title: string; page: number }[];
  };
  expect(reg.id).toBe(UPLOAD_SLUG);
  expect(reg.imageCount).toBe(5);
  expect(['webp', 'png']).toContain(reg.imageFormat);
  expect(reg.pageOffset).toBe(-1);
  expect(reg.sections).toEqual([{ title: 'First Study', page: 2 }]);

  // All five page images landed on the "bucket" as real, non-empty files
  const files = fs.readdirSync(UPLOAD_DIR).sort();
  expect(files).toEqual(
    Array.from({ length: 5 }, (_, i) => `page-${String(i).padStart(3, '0')}.${reg.imageFormat}`)
  );
  for (const f of files) {
    expect(fs.statSync(path.join(UPLOAD_DIR, f)).size).toBeGreaterThan(1000);
  }
});

test('public books API serves the compiled-in catalog', async ({ page }) => {
  const res = await page.request.get('/api/books');
  expect(res.ok()).toBe(true);
  const { books } = await res.json();
  const ids = books.map((b: { id: string }) => b.id);
  expect(ids).toContain('arban');
  expect(ids).toContain('charlier');
});

// Read TOC editor rows as [title, page] pairs
async function tocRowValues(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const rows = document.querySelectorAll('[data-testid="toc-rows"] > div');
    return Array.from(rows).map(row => {
      const inputs = row.querySelectorAll('input');
      return [inputs[0]?.value ?? '', inputs[1]?.value ?? ''];
    });
  });
}

test('suggests TOC entries from the PDF text layer (create mode)', async ({ page }) => {
  await page.route('**/api/admin/books', route =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { books: [] } })
      : route.fallback()
  );
  await page.goto('/admin/books');
  await page.setInputFiles('[data-testid="pdf-input"]', TEST_PDF);
  await page.getByRole('button', { name: /Suggest from pages/ }).click();

  // The generated PDF has a text layer, so this resolves near-instantly
  await expect
    .poll(async () => tocRowValues(page), { timeout: 30_000 })
    .toEqual([
      ['Test PDF - page 1', '1'],
      ['Test PDF - page 2', '2'],
      ['Test PDF - page 3', '3'],
      ['Test PDF - page 4', '4'],
      ['Test PDF - page 5', '5'],
    ]);
});

test('suggests TOC entries by OCR of uploaded page images (edit mode)', async ({ page }) => {
  test.setTimeout(180_000); // OCR worker boot + three pages
  const ocrBook = {
    id: 'ocrbook',
    title: 'OCR Book (E2E Only)',
    shortTitle: 'OCR Book',
    imagePrefix: 'ocrbook',
    totalPages: 3,
    pageOffset: -1,
    minExercisePage: 1,
    sections: [],
  };
  await page.route('**/api/admin/books', route =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { books: [ocrBook] } })
      : route.fallback()
  );
  await page.goto('/admin/books');
  await page.getByRole('button', { name: 'Edit', exact: true }).click();
  await page.getByRole('button', { name: /Suggest from pages/ }).click();
  await expect(page.locator('[data-testid="scan-progress"]')).toBeVisible();

  // tesseract reads the big printed titles off the generated pages
  await expect
    .poll(async () => tocRowValues(page), { timeout: 150_000 })
    .toEqual([
      [expect.stringContaining('STUDY'), '1'],
      [expect.stringContaining('STUDY'), '2'],
      [expect.stringContaining('STUDY'), '3'],
    ]);
  // Suggested rows carry a preview strip of the scanned heading
  await expect(page.locator('[data-testid="toc-rows"] img').first()).toBeVisible();
});

test('image verifier reports missing pages', async ({ page }) => {
  // Claims 25 pages but the testbook images stop at index 022, so display
  // pages 21-25 (image files 023-027) are missing
  const rtBook = {
    id: 'rtbook',
    title: 'Runtime Book (Mocked)',
    shortTitle: 'Runtime Book',
    imagePrefix: 'testbook',
    totalPages: 25,
    pageOffset: 2,
    minExercisePage: 3,
    sections: [],
  };
  await page.route('**/api/books**', route => route.fulfill({ json: { books: [rtBook] } }));
  await page.route('**/api/admin/books', route =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { books: [rtBook] } })
      : route.fallback()
  );
  // The proxy doesn't know the mocked book; serve its images from the
  // local test bucket, 404ing where no file exists
  await page.route(/\/api\/image\/\d{3}\?book=rtbook/, async route => {
    const num = route.request().url().match(/image\/(\d{3})/)![1];
    const upstream = await page.request.get(`http://localhost:8080/testbook/page-${num}.png`);
    if (upstream.ok()) {
      return route.fulfill({ body: await upstream.body(), contentType: 'image/png' });
    }
    return route.fulfill({ status: 404 });
  });

  await page.goto('/admin/books');
  await page.getByLabel('Book to check').selectOption('rtbook');
  await page.getByRole('button', { name: 'Check pages' }).click();

  const result = page.locator('[data-testid="audit-result"]');
  await expect(result).toBeVisible({ timeout: 30_000 });
  await expect(result).toContainText('Checked 28 page images');
  await expect(result).toContainText('Missing (5): pages 21, 22, 23, 24, 25');
});
