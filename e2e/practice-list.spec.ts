import { test, expect } from '@playwright/test';

// Lists as a practice tool: the sidebar's "My lists" link opens the panel,
// opening an exercise starts a practice session, and the practice bar steps
// through the list's items in order (across books). The lists API is mocked
// (no Supabase in e2e builds).

const LIST = { id: 'l1', name: 'Warm-ups', created_at: '', updated_at: '', user_id: 'u1' };
const ITEMS = [
  { id: 'i1', list_id: 'l1', page_number: 11, book_id: 'arban', title: 'Zephyr Warm-up', created_at: '2026-07-01T00:00:00Z' },
  { id: 'i2', list_id: 'l1', page_number: 50, book_id: 'arban', title: null, created_at: '2026-07-01T00:00:00Z' },
  { id: 'i3', list_id: 'l1', page_number: 5, book_id: 'testbook', title: 'Quux Etude', created_at: '2026-07-01T00:00:00Z' },
];

test('practice a list from the sidebar, stepping through items', async ({ page }) => {
  await page.route('**/api/lists', route =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { lists: [LIST] } })
      : route.fallback()
  );
  await page.route('**/api/list-items?list_id=l1', route =>
    route.fulfill({ json: { items: ITEMS } })
  );

  await page.goto('/?page=100');

  // Lists are one click away in the sidebar
  await page.getByRole('button', { name: 'My lists' }).click();
  await page.getByRole('button', { name: /Warm-ups/ }).click();

  // Opening an item starts practicing at that item
  await page.getByRole('button', { name: /Zephyr Warm-up/ }).click();
  const bar = page.locator('[data-testid="practice-bar"]');
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('Warm-ups');
  await expect(bar).toContainText('1 / 3');
  await expect(page).toHaveURL(/page=11/);

  // Next steps through the list, including into another book
  await bar.getByTitle('Next exercise in the list').click();
  await expect(bar).toContainText('2 / 3');
  await expect(page).toHaveURL(/page=50/);
  await bar.getByTitle('Next exercise in the list').click();
  await expect(bar).toContainText('3 / 3');
  await expect(page).toHaveURL(/book=testbook/);
  await expect(page).toHaveURL(/page=5/);
  await expect(bar.getByTitle('Next exercise in the list')).toBeDisabled();

  // Manual page turns don't kick you out; prev jumps back into sequence
  await page.locator('#image-container').click();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/page=6/);
  await expect(bar).toBeVisible();
  await bar.getByTitle('Previous exercise in the list').click();
  await expect(bar).toContainText('2 / 3');
  await expect(page).toHaveURL(/page=50/);

  // The session survives a reload
  await page.reload();
  await expect(page.locator('[data-testid="practice-bar"]')).toContainText('2 / 3');

  // Exit removes the bar
  await page.getByLabel('Stop practicing this list').click();
  await expect(page.locator('[data-testid="practice-bar"]')).toHaveCount(0);
});

test('practice button starts from the first item', async ({ page }) => {
  await page.route('**/api/lists', route =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { lists: [LIST] } })
      : route.fallback()
  );
  await page.route('**/api/list-items?list_id=l1', route =>
    route.fulfill({ json: { items: ITEMS } })
  );

  await page.goto('/?page=100');
  await page.getByRole('button', { name: 'My lists' }).click();
  await page.getByRole('button', { name: /Warm-ups/ }).click();
  await page.getByRole('button', { name: 'Practice', exact: true }).click();

  const bar = page.locator('[data-testid="practice-bar"]');
  await expect(bar).toContainText('1 / 3');
  await expect(page).toHaveURL(/page=11/);
});
