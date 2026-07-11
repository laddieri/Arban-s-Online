import { test, expect } from '@playwright/test';

// Admin "find videos for this page": YouTube search (mocked) with a
// TOC-derived query, and attaching a result as an approved video.

test('admin searches YouTube for the open page and attaches a result', async ({ page }) => {
  let searchedQuery: string | null = null;
  let attachPayload: Record<string, unknown> | null = null;

  await page.route('**/api/admin/me', route => route.fulfill({ json: { admin: true } }));
  await page.route('**/api/admin/videos/search**', route => {
    const url = new URL(route.request().url());
    searchedQuery = url.searchParams.get('q');
    return route.fulfill({
      json: {
        query: url.searchParams.get('q') ?? 'Test Section One Test trumpet',
        results: [
          {
            videoId: 'abcdefghijk',
            title: 'Test Section One - performance',
            channel: 'Trumpet Channel',
            thumbnail: null,
            publishedAt: '2026-01-01T00:00:00Z',
          },
          {
            videoId: 'lmnopqrstuv',
            title: 'Another take',
            channel: 'Brass Studio',
            thumbnail: null,
            publishedAt: '2026-01-02T00:00:00Z',
          },
        ],
      },
    });
  });
  await page.route('**/api/admin/videos', route => {
    attachPayload = route.request().postDataJSON();
    return route.fulfill({ status: 201, json: { message: 'Video attached' } });
  });

  await page.goto('/?book=testbook&page=3');
  await page.locator('button[title="Find videos for this page"]').click();

  // The modal searched immediately and shows both candidates
  const results = page.locator('[data-testid="find-videos-results"]');
  await expect(results.getByText('Test Section One - performance')).toBeVisible();
  await expect(results.getByText('Brass Studio')).toBeVisible();

  // Attach the first result: payload carries book/page and the video
  await results.getByRole('button', { name: 'Attach' }).first().click();
  await expect(results.getByText('Added ✓')).toBeVisible();
  expect(attachPayload).toMatchObject({
    book_id: 'testbook',
    page_number: 3,
    video_id: 'abcdefghijk',
    title: 'Test Section One - performance',
    performer: 'Trumpet Channel',
  });

  // Editing the query and re-searching passes it through
  await page.getByLabel('Search query').fill('my custom query');
  await page.getByRole('button', { name: 'Search', exact: true }).click();
  await expect.poll(() => searchedQuery).toBe('my custom query');
});

test('the find-videos button is admin-only', async ({ page }) => {
  await page.route('**/api/admin/me', route => route.fulfill({ status: 403, json: {} }));
  await page.goto('/?page=50');
  await expect(page.locator('#image-container img')).toBeVisible();
  await expect(page.locator('button[title="Find videos for this page"]')).toHaveCount(0);
});
