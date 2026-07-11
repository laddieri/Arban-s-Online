import { test, expect } from '@playwright/test';

// Admin-only "add this page to the table of contents" button in the viewer.
// Admin status and the runtime book are mocked at the network layer (no
// Supabase in e2e builds); under test: gating, the PATCH payload (entry
// inserted in page order), and the sidebar TOC refreshing in place.

const rtBook = {
  id: 'rtbook',
  title: 'Runtime Book (Mocked)',
  shortTitle: 'Runtime Book',
  imagePrefix: 'testbook', // reuse the generated test images
  totalPages: 20,
  pageOffset: 2,
  minExercisePage: 3,
  sections: [{ title: 'Existing Entry', page: 3 }],
};

test('admin adds the open page to a runtime book TOC', async ({ page }) => {
  let sections = rtBook.sections;
  let patched: { sections: { title: string; page: number }[] } | null = null;

  await page.route('**/api/books**', route =>
    route.fulfill({ json: { books: [{ ...rtBook, sections }] } })
  );
  await page.route('**/api/admin/me', route => route.fulfill({ json: { admin: true } }));
  await page.route('**/api/admin/books/rtbook', route => {
    patched = route.request().postDataJSON();
    sections = patched!.sections;
    return route.fulfill({ json: { message: 'ok' } });
  });

  await page.goto('/?book=rtbook&page=5');
  await expect(page.locator('h1').first()).toContainText('Runtime Book');

  await page.locator('button[title="Add this page to the table of contents"]').click();
  await page.getByPlaceholder('Study No. 5').fill('New Étude');
  await page.getByRole('button', { name: 'Save', exact: true }).click();

  // Entry lands in page order after the existing page-3 entry
  await expect.poll(() => patched).not.toBeNull();
  expect(patched!.sections).toEqual([
    { title: 'Existing Entry', page: 3 },
    { title: 'New Étude', page: 5 },
  ]);

  // The sidebar TOC shows the new entry without a reload
  await expect(page.getByText('New Étude')).toBeVisible();
});

test('the button is hidden for built-in books and for non-admins', async ({ page }) => {
  const tocButton = page.locator('button[title="Add this page to the table of contents"]');

  // Admin on a compiled-in book: not editable, no button
  await page.route('**/api/admin/me', route => route.fulfill({ json: { admin: true } }));
  await page.goto('/?page=50');
  await expect(page.locator('#image-container img')).toBeVisible();
  await expect(tocButton).toHaveCount(0);

  // Non-admin on a runtime book: no button either
  await page.unroute('**/api/admin/me');
  await page.route('**/api/admin/me', route => route.fulfill({ status: 403, json: {} }));
  await page.route('**/api/books**', route => route.fulfill({ json: { books: [rtBook] } }));
  await page.goto('/?book=rtbook&page=5');
  await expect(page.locator('h1').first()).toContainText('Runtime Book');
  await expect(tocButton).toHaveCount(0);
});
