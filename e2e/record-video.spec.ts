import { test, expect, Page } from '@playwright/test';

// The floating performance recorder: opens over the viewer so the sheet
// music stays visible while recording. Chromium runs with fake camera/mic
// devices (see playwright.config.ts); recording is fully local.

async function recordATake(page: Page) {
  await page.locator('button[title="Add menu"]').click();
  await page.getByRole('button', { name: 'Record a video' }).click();

  const overlay = page.locator('[data-testid="recorder-overlay"]');
  await expect(overlay).toBeVisible();

  await overlay.getByRole('button', { name: 'Turn on camera' }).click();

  // The sheet music is still visible next to the live camera preview
  await expect(page.locator('#image-container img').first()).toBeVisible();
  await overlay.getByRole('button', { name: /Start recording/ }).click();

  // While recording the card collapses to a small REC pill: no camera
  // preview covering the top line of music, just timer + stop
  const pill = page.locator('[data-testid="recorder-pill"]');
  await expect(pill).toBeVisible();
  await expect(overlay).toHaveCount(0);
  await expect(page.locator('#image-container img').first()).toBeVisible();

  // Peeking at the framing re-opens the preview; collapsing brings the pill back
  await pill.getByLabel('Show the camera preview').click();
  await expect(page.locator('[data-testid="recorder-overlay"] video')).toBeVisible();
  await page.getByLabel('Hide the camera preview').click();
  await expect(pill).toBeVisible();

  await page.waitForTimeout(1000);
  await pill.getByRole('button', { name: /Stop/ }).click();
  return page.locator('[data-testid="recorder-overlay"]');
}

test('record with the music visible, then the YouTube handoff', async ({ page }) => {
  await page.goto('/?page=11'); // First Studies
  const overlay = await recordATake(page);

  // Review + handoff: playback, named download, YouTube link, copyable title
  const playback = overlay.locator('[data-testid="recorded-playback"]');
  await expect(playback).toBeVisible();
  await expect(playback).toHaveAttribute('src', /^blob:/);
  await expect(overlay.locator('[data-testid="download-take"]')).toHaveAttribute(
    'download',
    /arban-page-11\.(webm|mp4)/
  );
  await expect(overlay.getByRole('link', { name: /YouTube/ })).toHaveAttribute(
    'href',
    'https://www.youtube.com/upload'
  );
  // The most specific TOC entry covering page 11 is the "#1 --> #6" range
  await expect(overlay.locator('[data-testid="suggested-title"]')).toHaveText(
    "#1 --> #6 — Arban's Method, page 11"
  );

  // The recorded file has real content
  const size = await page.evaluate(async () => {
    const video = document.querySelector('[data-testid="recorded-playback"]') as HTMLVideoElement;
    const res = await fetch(video.src);
    return (await res.blob()).size;
  });
  expect(size).toBeGreaterThan(10_000);

  // "Save the link" opens the submission form (sign-in step when anonymous)
  await overlay.getByRole('button', { name: /Save the link/ }).click();
  await expect(page.getByRole('heading', { name: /video for page/i })).toBeVisible();
});

test.describe('on a phone', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('the music stays visible while recording', async ({ page }) => {
    await page.goto('/?page=11');
    const overlay = await recordATake(page);
    await expect(overlay.locator('[data-testid="recorded-playback"]')).toBeVisible();
    // Retake returns to a live preview
    await overlay.getByRole('button', { name: 'Retake' }).click();
    await expect(overlay.getByRole('button', { name: /Start recording/ })).toBeVisible();
    await expect(page.locator('#image-container img').first()).toBeVisible();
  });
});

test('private recordings show with a badge and can be removed', async ({ page }) => {
  let deletedId: string | null = null;
  await page.route(/\/api\/my-videos\?book=arban&page=50/, route =>
    route.fulfill({
      json: {
        videos: [
          { myVideoId: 'pv1', videoId: 'abcdefghijk', title: 'My take from Tuesday', isPrivate: true },
        ],
      },
    })
  );
  await page.route('**/api/my-videos', route => {
    if (route.request().method() === 'DELETE') {
      deletedId = route.request().postDataJSON().id;
      return route.fulfill({ json: { message: 'Recording deleted' } });
    }
    return route.fallback();
  });

  await page.goto('/?page=50');
  await page.locator('button[title^="View 1 video"]').click();
  await expect(page.getByText('My take from Tuesday')).toBeVisible();
  await expect(page.getByText('Private', { exact: true })).toBeVisible();

  page.on('dialog', dialog => dialog.accept());
  await page.getByLabel('Remove from my recordings').click();
  await expect.poll(() => deletedId).toBe('pv1');
});
