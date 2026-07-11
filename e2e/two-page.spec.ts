import { test, expect, Page } from '@playwright/test';

// Two-page spread view: facing pages side by side, spread-wise navigation,
// persistence, and availability on small screens.

const toggle = (page: Page) => page.locator('button[title*="Two-page view"]');
const images = (page: Page) => page.locator('#image-container img');
const pageInput = (page: Page) => page.locator('span.hidden.lg\\:inline input');

test('toggle shows the next page alongside and navigates by spread', async ({ page }) => {
  await page.goto('/?page=50');
  await expect(images(page)).toHaveCount(1);

  await toggle(page).click();
  await expect(images(page)).toHaveCount(2);
  // Arban offset 7: display 50/51 -> image files 057/058
  await expect(images(page).nth(0)).toHaveAttribute('src', /page-057\.png/);
  await expect(images(page).nth(1)).toHaveAttribute('src', /page-058\.png/);

  // Next moves a whole spread: 50 -> 52
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page).toHaveURL(/page=52/);
  await expect(images(page).nth(0)).toHaveAttribute('src', /page-059\.png/);
  await expect(images(page).nth(1)).toHaveAttribute('src', /page-060\.png/);

  // Arrow keys also move by spread (blur the page input first)
  await page.locator('#image-container').click();
  await page.keyboard.press('ArrowLeft');
  await expect(page).toHaveURL(/page=50/);

  // Back to single page
  await toggle(page).click();
  await expect(images(page)).toHaveCount(1);
});

test('persists across reloads and clamps at the last page', async ({ page }) => {
  await page.goto('/?page=50');
  await toggle(page).click();
  await expect(images(page)).toHaveCount(2);

  await page.reload();
  await expect(images(page)).toHaveCount(2);

  // On the last page there is no right-hand page and Next is disabled
  await pageInput(page).fill('347');
  await expect(images(page)).toHaveCount(1);
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  // The spread (346, 347) already shows the final page, so Next stays
  // disabled there too; one earlier (345, 346) it re-enables
  await pageInput(page).fill('346');
  await expect(images(page)).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeDisabled();
  await pageInput(page).fill('345');
  await expect(images(page)).toHaveCount(2);
  await expect(page.getByRole('button', { name: 'Next', exact: true })).toBeEnabled();

  // Cleanup so other tests aren't affected by the persisted setting
  await toggle(page).click();
});

test.describe('on small screens', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the option is available and works', async ({ page }) => {
    await page.goto('/?page=14');
    await expect(toggle(page)).toBeVisible();
    await toggle(page).click();
    await expect(images(page)).toHaveCount(2);
    await expect(images(page).nth(0)).toHaveAttribute('src', /page-021\.png/);
    await expect(images(page).nth(1)).toHaveAttribute('src', /page-022\.png/);
  });
});
