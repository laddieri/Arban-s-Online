import { test, expect } from '@playwright/test';

// The in-browser performance recorder inside the video submission form.
// Chromium runs with fake camera/mic devices (see playwright.config.ts);
// recording is fully local (download + manual YouTube upload), so no
// network mocking is needed for the recorder itself.

test('record a take, review it, and get the YouTube handoff', async ({ page }) => {
  await page.goto('/?page=11'); // First Studies

  // The add menu is available without signing in; submission handles auth
  await page.locator('button[title="Add menu"]').click();
  await page.getByRole('button', { name: 'Add a video' }).click();

  // Recorder starts collapsed inside the form
  await page.locator('[data-testid="record-toggle"]').click();
  await expect(page.getByText('nothing is uploaded', { exact: false })).toBeVisible();

  // Record a short take from the fake camera
  await page.getByRole('button', { name: 'Turn on camera' }).click();
  await page.getByRole('button', { name: /Start recording/ }).click();
  await page.waitForTimeout(1500);
  await page.getByRole('button', { name: /Stop/ }).click();

  // Review + handoff: playback, named download, YouTube link, copyable title
  const playback = page.locator('[data-testid="recorded-playback"]');
  await expect(playback).toBeVisible();
  await expect(playback).toHaveAttribute('src', /^blob:/);
  await expect(page.locator('[data-testid="download-take"]')).toHaveAttribute(
    'download',
    /arban-page-11\.(webm|mp4)/
  );
  await expect(page.getByRole('link', { name: /Upload it on YouTube/ })).toHaveAttribute(
    'href',
    'https://www.youtube.com/upload'
  );
  // The most specific TOC entry covering page 11 is the "#1 --> #6" range
  await expect(page.locator('[data-testid="suggested-title"]')).toHaveText(
    "#1 --> #6 — Arban's Method, page 11"
  );

  // The recorded file has real content
  const size = await page.evaluate(async () => {
    const video = document.querySelector('[data-testid="recorded-playback"]') as HTMLVideoElement;
    const res = await fetch(video.src);
    return (await res.blob()).size;
  });
  expect(size).toBeGreaterThan(10_000);

  // Retake goes back to a live preview
  await page.getByRole('button', { name: 'Retake' }).click();
  await expect(page.getByRole('button', { name: /Start recording/ })).toBeVisible();
});
