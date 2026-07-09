import { test, expect, Page } from '@playwright/test';

// Multi-book behavior, exercised against the e2e-only second book
// (NEXT_PUBLIC_TEST_BOOK=1 in the build; see config/books.ts).

const pageInput = (page: Page) => page.locator('span.hidden.lg\\:inline input');
const switcher = (page: Page) => page.getByLabel('Select book');

test('book switcher swaps books and remembers position in each', async ({ page }) => {
  await page.goto('/?page=50');
  await expect(pageInput(page)).toHaveValue('50');
  await expect(switcher(page)).toBeVisible();

  // Switch to the test book: header updates, URL gains ?book=, cover shows
  await switcher(page).selectOption('testbook');
  await expect(page.locator('h1').first()).toContainText('Test Book');
  await expect(page).toHaveURL(/book=testbook/);
  await expect(pageInput(page)).toHaveValue('i');

  // Navigate within the test book; its page image comes from testbook/
  await pageInput(page).fill('5');
  await expect(page).toHaveURL(/book=testbook&page=5|page=5&book=testbook/);
  const src = await page.locator('#image-container img').getAttribute('src');
  expect(src).toContain('/testbook/page-007.png'); // page 5 + offset 2

  // Switch back to Arban: resumes at page 50, ?book= dropped from the URL
  await switcher(page).selectOption('arban');
  await expect(pageInput(page)).toHaveValue('50');
  await expect(page).not.toHaveURL(/book=/);

  // And back to the test book: resumes at page 5
  await switcher(page).selectOption('testbook');
  await expect(pageInput(page)).toHaveValue('5');
});

test('deep links with ?book= load the right book', async ({ page }) => {
  await page.goto('/?book=testbook&page=10');
  await expect(page.locator('h1').first()).toContainText('Test Book');
  await expect(pageInput(page)).toHaveValue('10');

  // Unknown book falls back to the default
  await page.goto('/?book=nonsense&page=50');
  await expect(page.locator('h1').first()).toContainText("Arban's");
  await expect(page).not.toHaveURL(/book=nonsense/);
});

test('TOC and search are scoped to the active book', async ({ page }) => {
  await page.goto('/?book=testbook&page=3');
  await expect(page.getByText('Test Section One')).toBeVisible();
  await expect(page.getByText('First Studies')).toHaveCount(0);

  // Arban content is not searchable from the test book
  const search = page.getByPlaceholder('Search exercises or page #');
  await search.fill('carnival');
  await expect(page.getByText('No matches')).toBeVisible();

  // Its own sections are
  await search.fill('test section two');
  await page.locator('[data-testid="toc-search-results"] button').first().click();
  await expect(page).toHaveURL(/page=10/);

  // Page clamping respects the smaller book (20 pages, not 347)
  await page.goto('/?book=testbook&page=300');
  await expect(page).toHaveURL(/page=20/);
});

test('history entries carry the book and navigate back to it', async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    const now = Date.now();
    localStorage.setItem(
      'arbans_page_history',
      JSON.stringify([
        { page: 50, timestamp: now - 3600000 }, // pre-multi-book entry (arban)
        { page: 5, timestamp: now - 7200000, book: 'testbook' },
      ])
    );
  });
  await page.goto('/history');

  // The test-book entry is labeled; the legacy entry is not
  await expect(page.getByText('Test Book - Page 5')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Page 50', exact: true })).toBeVisible();

  // Clicking the test-book entry opens the viewer in that book
  await page.getByText('Test Book - Page 5').click();
  await expect(page).toHaveURL(/book=testbook/);
  await expect(page).toHaveURL(/page=5/);
});
