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
    totalPages: number;
    imageFormat: string;
    pageOffset: number;
    sections: { title: string; page: number }[];
  };
  expect(reg.id).toBe(UPLOAD_SLUG);
  expect(reg.totalPages).toBe(5);
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
