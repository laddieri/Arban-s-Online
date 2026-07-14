import { test, expect } from '@playwright/test';

// Smart fullscreen: entering fullscreen zooms past the page's white paper
// margins so the printed music itself spans (almost) the screen width.
// The generated e2e pages carry staff lines from x=81..719 of 800px
// (~83% of the width once padded), so the fit lands around 115-120%,
// clearly above both the 100% mobile and 60% desktop defaults.

const FIT_ZOOM = /^1[12][0-9]%$/;

test('fullscreen zooms to the music, exit restores the previous zoom', async ({ page }) => {
  await page.goto('/?page=11');
  // Wait for the load to fully settle (opacity-100 = onLoad ran), then
  // capture whatever the starting zoom is - the initial desktop zoom is
  // timing-dependent (60% or 100%), and the exact value doesn't matter
  await expect(page.locator('img[alt^="Page 11"]')).toHaveClass(/opacity-100/);
  const initialZoom = (await page.getByText(/^\d+%$/).textContent())!;
  expect(initialZoom).not.toMatch(FIT_ZOOM);

  await page.getByTitle('Enter fullscreen').click();
  await expect(page.getByText(FIT_ZOOM)).toBeVisible();
  // Scrolled down past the blank top margin to where the music starts
  await expect
    .poll(() => page.locator('#image-container').evaluate(el => el.scrollTop))
    .toBeGreaterThan(200);

  await page.getByTitle('Exit fullscreen').click();
  await expect(page.getByText(initialZoom)).toBeVisible();
});

test('manual zoom while fullscreen turns off the auto-fit for page turns', async ({ page }) => {
  await page.goto('/?page=11');
  await expect(page.locator('#image-container img').first()).toBeVisible();
  await page.getByTitle('Enter fullscreen').click();
  await expect(page.getByText(FIT_ZOOM)).toBeVisible();

  await page.getByTitle('Zoom out').click();
  await page.getByTitle('Zoom out').click();
  const manualZoom = await page.getByText(/^\d+%$/).textContent();
  expect(manualZoom).not.toMatch(FIT_ZOOM);

  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.locator('img[alt^="Page 12"]')).toBeVisible();
  await expect(page.getByText(manualZoom!)).toBeVisible(); // no re-fit
});

test.describe('pseudo-fullscreen on an iPhone', () => {
  test.use({
    viewport: { width: 390, height: 844 },
    hasTouch: true,
    isMobile: true,
    userAgent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1',
  });

  test('fullscreen fits the music edge to edge on a phone', async ({ page }) => {
    await page.goto('/?page=11');
    await expect(page.locator('#image-container img').first()).toBeVisible();
    await expect(page.getByText('100%')).toBeVisible(); // mobile starting zoom

    await page.getByTitle('Enter fullscreen').click();
    await expect(page.getByText(FIT_ZOOM)).toBeVisible();
    await expect(page.getByRole('banner')).toBeHidden(); // header collapses

    await page.getByTitle('Exit fullscreen').click();
    await expect(page.getByText('100%')).toBeVisible();
    await expect(page.getByRole('banner')).toBeVisible();
  });
});
