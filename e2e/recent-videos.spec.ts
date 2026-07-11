import { test, expect } from '@playwright/test';

// The /videos page: newest approved community submissions across all books.
// The API is mocked (no Supabase in e2e builds); under test are the cards,
// the thumbnail-facade player, and the jump-to-page links.

const MOCK_VIDEOS = [
  {
    id: 'v1',
    videoId: 'dQw4w9WgXcQ',
    title: 'Characteristic Study No. 1',
    performer: 'Alice Trumpet',
    page: 202,
    book: 'arban',
    addedAt: '2026-07-10T12:00:00Z',
  },
  {
    id: 'v2',
    videoId: 'abcdefghijk',
    title: 'Test Book Demo',
    performer: null,
    page: 5,
    book: 'testbook',
    addedAt: '2026-07-09T12:00:00Z',
  },
];

test('lists recent videos; playing one opens its sheet music with the video', async ({ page }) => {
  await page.route('**/api/videos/recent', route =>
    route.fulfill({ json: { videos: MOCK_VIDEOS } })
  );
  // The viewer fetches the target page's video list; it must contain the
  // deep-linked video for the overlay to auto-open
  await page.route(/\/api\/videos\/5\?book=testbook/, route =>
    route.fulfill({
      json: { videos: [{ videoId: 'abcdefghijk', title: 'Test Book Demo' }] },
    })
  );

  await page.goto('/videos');
  const grid = page.locator('[data-testid="recent-videos-grid"]');
  await expect(grid).toBeVisible();
  await expect(grid.locator('> div')).toHaveCount(2);

  // Card metadata: title, performer, book-aware page label (testbook
  // offset 2 means internal page 5 displays as page 5)
  await expect(page.getByText('Characteristic Study No. 1')).toBeVisible();
  await expect(page.getByText('Alice Trumpet')).toBeVisible();
  await expect(page.getByRole('link', { name: "Arban's Method - Page 202" })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Test Book - Page 5' })).toBeVisible();
  await expect(page.locator('[data-testid="video-facade"]')).toHaveCount(2);
  await expect(page.locator('iframe')).toHaveCount(0);

  // Play takes you to the sheet music with the video overlay playing
  await page.getByRole('button', { name: 'Play Test Book Demo' }).click();
  await expect(page).toHaveURL(/book=testbook&page=5/);
  await expect(page.locator('h1').first()).toContainText('Test Book');
  await expect(page.locator('#image-container img').first()).toHaveAttribute(
    'src',
    /testbook\/page-007\.png/
  );
  const iframe = page.locator('iframe');
  await expect(iframe).toHaveCount(1);
  await expect(iframe).toHaveAttribute(
    'src',
    'https://www.youtube-nocookie.com/embed/abcdefghijk?autoplay=1'
  );
  // The one-shot ?video= param is consumed after the overlay opens
  await expect(page).not.toHaveURL(/video=/);
});

test('shows an empty state when no videos exist', async ({ page }) => {
  await page.route('**/api/videos/recent', route => route.fulfill({ json: { videos: [] } }));
  await page.goto('/videos');
  await expect(page.getByText('No videos yet.')).toBeVisible();
});

test('sidebar links to the recent videos page', async ({ page }) => {
  await page.goto('/?page=50');
  await page.getByRole('link', { name: 'Recent videos' }).click();
  await expect(page).toHaveURL(/\/videos/);
  await expect(page.getByRole('heading', { name: 'Recent Videos' })).toBeVisible();
});
