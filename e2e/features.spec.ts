import { test, expect, Page, BrowserContext } from '@playwright/test';

// Pinch-to-zoom, anchored wheel zoom, night mode, and the native metronome.

const zoomText = (page: Page) => page.locator('span.w-12');

async function pinch(
  context: BrowserContext,
  page: Page,
  cx: number,
  cy: number,
  startGap: number,
  endGap: number,
  steps = 12
) {
  const client = await context.newCDPSession(page);
  const mk = (gap: number) => [
    { x: cx - gap / 2, y: cy, id: 0 },
    { x: cx + gap / 2, y: cy, id: 1 },
  ];
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: mk(startGap) });
  for (let i = 1; i <= steps; i++) {
    const gap = startGap + ((endGap - startGap) * i) / steps;
    await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: mk(gap) });
  }
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await client.detach();
}

test.describe('pinch zoom on mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('two-finger pinch zooms in and out', async ({ page, context }) => {
    await page.goto('/?page=50');
    await expect(zoomText(page)).toHaveText('100%');

    await pinch(context, page, 195, 380, 100, 320);
    const zoomedIn = parseInt((await zoomText(page).textContent()) ?? '0', 10);
    expect(zoomedIn).toBeGreaterThan(100);

    await pinch(context, page, 195, 380, 320, 120);
    const zoomedOut = parseInt((await zoomText(page).textContent()) ?? '0', 10);
    expect(zoomedOut).toBeLessThan(zoomedIn);
  });

  test('pinch zoom anchors at the gesture midpoint', async ({ page, context }) => {
    await page.goto('/?page=50');
    await expect(zoomText(page)).toHaveText('100%');
    const before = await page.evaluate(() => {
      const c = document.getElementById('image-container')!;
      return { left: c.scrollLeft, top: c.scrollTop };
    });
    // Pinch out at an off-center point: scroll must chase the gesture
    await pinch(context, page, 300, 600, 100, 300);
    const after = await page.evaluate(() => {
      const c = document.getElementById('image-container')!;
      return { left: c.scrollLeft, top: c.scrollTop };
    });
    expect(after.top > before.top || after.left > before.left).toBe(true);
  });
});

test.describe('desktop zoom and night mode', () => {
  test('wheel zooms at the cursor and click-drag pans', async ({ page }) => {
    await page.goto('/?page=50');
    await expect(page.locator('#image-container img')).toBeVisible();
    const initial = parseInt((await zoomText(page).textContent()) ?? '0', 10);

    // Plain wheel (no modifier) zooms in
    await page.mouse.move(900, 500);
    for (let i = 0; i < 5; i++) await page.mouse.wheel(0, -100);
    const zoomed = parseInt((await zoomText(page).textContent()) ?? '0', 10);
    expect(zoomed).toBeGreaterThan(initial);

    // Ctrl+wheel (trackpad pinch) still zooms too
    await page.keyboard.down('Control');
    await page.mouse.wheel(0, -100);
    await page.keyboard.up('Control');
    expect(parseInt((await zoomText(page).textContent()) ?? '0', 10)).toBeGreaterThan(zoomed);

    // Click-drag pans the zoomed page (drag up-left scrolls down-right)
    const scrollPos = () =>
      page.evaluate(() => {
        const c = document.getElementById('image-container')!;
        return { left: c.scrollLeft, top: c.scrollTop };
      });
    const before = await scrollPos();
    await page.mouse.move(900, 500);
    await page.mouse.down();
    await page.mouse.move(700, 300, { steps: 5 });
    await page.mouse.up();
    const after = await scrollPos();
    expect(after.left).toBeGreaterThan(before.left);
    expect(after.top).toBeGreaterThan(before.top);
  });

  test('night mode inverts the page and persists', async ({ page }) => {
    await page.goto('/?page=50');
    const img = page.locator('#image-container img');
    const toggle = page.locator('button[title*="Night mode"]');

    await toggle.click();
    await expect(img).toHaveCSS('filter', /invert/);

    await page.reload();
    await expect(page.locator('#image-container img')).toHaveCSS('filter', /invert/);

    await page.locator('button[title*="Night mode"]').click();
    await expect(page.locator('#image-container img')).not.toHaveCSS('filter', /invert/);
  });
});

test.describe('metronome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/?page=50');
    await page.locator('button[title="Open metronome"]').click();
  });

  test('is native (no third-party iframe)', async ({ page }) => {
    await expect(page.locator('iframe:visible')).toHaveCount(0);
    await expect(page.getByText('BPM')).toBeVisible();
  });

  test('start/stop and beat indicator', async ({ page }) => {
    await page.getByRole('button', { name: 'Start' }).click();
    await expect(page.getByRole('button', { name: 'Stop' })).toBeVisible();

    // At 120bpm the active dot moves every 500ms; sample for distinct states
    const states = new Set<string>();
    for (let i = 0; i < 8; i++) {
      states.add(
        await page.locator('[data-testid="beat-dots"]').evaluate(el =>
          Array.from(el.children).map(c => (c.className.includes('bg-blue') ? '1' : '0')).join('')
        )
      );
      await page.waitForTimeout(160);
    }
    expect(states.size).toBeGreaterThanOrEqual(3);

    await page.getByRole('button', { name: 'Stop' }).click();
    await expect(page.getByRole('button', { name: 'Start' })).toBeVisible();
  });

  test('BPM buttons, tap tempo, and beats per measure', async ({ page }) => {
    await page.locator('button[title="Faster"]').click();
    await page.locator('button[title="Faster"]').click();
    await expect(page.locator('.text-5xl')).toHaveText('122');

    // ~500ms taps => ~120bpm (wide bounds: click dispatch adds jitter)
    const tap = page.getByRole('button', { name: 'Tap' });
    for (let i = 0; i < 4; i++) {
      await tap.click();
      await page.waitForTimeout(500);
    }
    const bpm = parseInt((await page.locator('.text-5xl').textContent()) ?? '0', 10);
    expect(bpm).toBeGreaterThanOrEqual(90);
    expect(bpm).toBeLessThanOrEqual(135);

    await page.getByRole('button', { name: '3', exact: true }).click();
    await expect(page.locator('[data-testid="beat-dots"] > div')).toHaveCount(3);
  });
});

test.describe('exercise videos', () => {
  test('overlay shows a facade; the iframe only mounts on play, via nocookie', async ({ page }) => {
    // Page 11 has a compiled-in example video (config/exerciseVideos.ts)
    await page.goto('/?page=11');
    await page.locator('button[title^="View 1 video"]').click();

    // Facade first: thumbnail + play button, no YouTube iframe loaded yet
    const facade = page.locator('[data-testid="video-facade"]');
    await expect(facade).toBeVisible();
    await expect(page.locator('iframe')).toHaveCount(0);

    // Play swaps in the privacy-domain iframe with autoplay
    await facade.click();
    const iframe = page.locator('iframe');
    await expect(iframe).toHaveCount(1);
    await expect(iframe).toHaveAttribute(
      'src',
      /^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}\?autoplay=1$/
    );
    await expect(facade).toHaveCount(0);
  });
});
