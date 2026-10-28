import { test, expect, Page } from '@playwright/test';

// Even margins: each page is cropped to its printed music and shown on a
// letter-shaped sheet with uniform half-inch margins (the print layout).
// The generated pages' staff lines span x 80..720 of 800, far inside the
// scan's own paper border.

const toggle = (page: Page) => page.locator('button[title*="Even margins"]');

// Geometry of each shown sheet: crop box as fractions of the sheet
async function sheets(page: Page) {
  return page.evaluate(() =>
    Array.from(document.querySelectorAll('[data-sheet-crop]')).map(crop => {
      const sheet = crop.parentElement!.getBoundingClientRect();
      const r = crop.getBoundingClientRect();
      return {
        left: +((r.left - sheet.left) / sheet.width).toFixed(3),
        right: +((sheet.right - r.right) / sheet.width).toFixed(3),
        top: +((r.top - sheet.top) / sheet.height).toFixed(3),
        height: Math.round(sheet.height),
      };
    })
  );
}

test('pages show the music inside even margins by default', async ({ page }) => {
  await page.goto('/?page=50');
  const img = page.locator('img[alt^="Page 50"]');
  await expect(img).toHaveAttribute('data-even-margins', 'on');
  await expect(toggle(page)).toHaveAttribute('title', /Even margins on/);

  const [s] = await sheets(page);
  const margin = +(0.5 / 8.5).toFixed(3);
  expect(s.left).toBeCloseTo(margin, 2);
  expect(s.right).toBeCloseTo(margin, 2);
  // Partly-empty page: the music starts at the top margin
  expect(s.top).toBeCloseTo(0.5 / 11, 2);
});

test('the toggle shows the original scan and is remembered', async ({ page }) => {
  await page.goto('/?page=50');
  const img = page.locator('img[alt^="Page 50"]');
  await expect(img).toHaveAttribute('data-even-margins', 'on');

  await toggle(page).click();
  await expect(img).toHaveAttribute('data-even-margins', 'off');
  await expect(page.locator('[data-sheet-crop]')).toHaveCount(0);

  await page.reload();
  await expect(page.locator('img[alt^="Page 50"]')).toHaveAttribute('data-even-margins', 'off');

  await toggle(page).click(); // restore the default for other tests
  await expect(page.locator('img[alt^="Page 50"]')).toHaveAttribute('data-even-margins', 'on');
});

test('facing pages line up on equal sheets in two-page view', async ({ page }) => {
  await page.goto('/?page=50');
  await page.locator('button[title*="Two-page view"]').click();
  await expect(page.locator('[data-sheet-crop]')).toHaveCount(2);
  const [a, b] = await sheets(page);
  expect(a.height).toBe(b.height);
  expect(a.left).toBe(b.left);
  expect(a.top).toBe(b.top);
  await page.locator('button[title*="Two-page view"]').click();
});

test('page turns keep the sheet layout', async ({ page }) => {
  await page.goto('/?page=50');
  await expect(page.locator('img[alt^="Page 50"]')).toHaveAttribute('data-even-margins', 'on');
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('img[alt^="Page 51"]')).toHaveAttribute('data-even-margins', 'on');
  await expect(page.locator('img[alt^="Page 51"]')).toHaveCSS('opacity', '1');
});
