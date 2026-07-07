import { test, expect } from '@playwright/test';

// PWA installability and offline behavior. The service worker only registers
// in production builds, which is what the e2e webServer runs.

test('manifest and icons are served', async ({ request }) => {
  const res = await request.get('/manifest.webmanifest');
  expect(res.ok()).toBe(true);
  const manifest = await res.json();
  expect(manifest.name).toContain("Arban's");
  expect(manifest.display).toBe('standalone');

  for (const icon of manifest.icons) {
    const iconRes = await request.get(icon.src);
    expect(iconRes.ok()).toBe(true);
    expect(iconRes.headers()['content-type']).toBe('image/png');
  }
});

test('app and visited pages keep working offline', async ({ page, context }) => {
  // First visit registers the service worker; wait until it's active
  await page.goto('/?page=50');
  await page.evaluate(() => navigator.serviceWorker.ready);

  // Reload while online: now the worker controls the page, so the HTML,
  // JS chunks, and the page image all pass through it and get cached
  await page.reload();
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>('#image-container img');
    return !!img && img.complete && img.naturalWidth > 0;
  });
  await page.waitForTimeout(500); // let async cache writes settle

  await context.setOffline(true);
  await page.reload();

  // Shell renders from cache and resumes at the same page
  await expect(page.locator('span.hidden.lg\\:inline input')).toHaveValue('50');
  // The previously viewed page image renders from cache
  await page.waitForFunction(() => {
    const img = document.querySelector<HTMLImageElement>('#image-container img');
    return !!img && img.complete && img.naturalWidth > 0;
  });

  await context.setOffline(false);
});
