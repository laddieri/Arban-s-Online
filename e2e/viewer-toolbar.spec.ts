import { test, expect } from '@playwright/test';

// The viewer toolbar's add menu and dialogs (one dialog at a time).

test.beforeEach(async ({ page }) => {
  await page.goto('/?page=11');
  await expect(page.locator('#image-container img').first()).toBeVisible();
});

test('add menu opens, closes on an outside click, and hides list actions when signed out', async ({ page }) => {
  const menuButton = page.locator('button[title="Add menu"]');
  await menuButton.click();
  await expect(page.getByRole('button', { name: 'Record a video' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add a video' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Add to list' })).toHaveCount(0);

  await page.locator('#image-container').click({ position: { x: 20, y: 20 } });
  await expect(page.getByRole('button', { name: 'Record a video' })).toHaveCount(0);
});

test('"Add a video" opens the submission form and closes the menu', async ({ page }) => {
  await page.locator('button[title="Add menu"]').click();
  await page.getByRole('button', { name: 'Add a video' }).click();

  await expect(page.getByRole('heading', { name: 'Share a video for page 11' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Record a video' })).toHaveCount(0);

  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.getByRole('heading', { name: /Share a video/ })).toHaveCount(0);
});

test('the print dialog opens and closes from the toolbar', async ({ page }) => {
  await page.locator('button[title="Print pages"]').click();
  const dialog = page.getByRole('heading', { name: 'Print Pages' });
  await expect(dialog).toBeVisible();
  await page.getByRole('button', { name: 'Close' }).click();
  await expect(dialog).toHaveCount(0);
});
