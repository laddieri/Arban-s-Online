import { test, expect, Page } from '@playwright/test';

// Reading-position persistence, URL sync, page clamping, history timezone
// grouping, and sidebar defaults.

const pageInput = (page: Page) => page.locator('span.hidden.lg\\:inline input');

test.describe('reading position', () => {
  test('fresh load shows the cover page without a page param', async ({ page }) => {
    await page.goto('/');
    await expect(pageInput(page)).toHaveValue('i');
  });

  test('navigation syncs the URL and persists the last page', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/page=-7/);
    // Interact through the page input first: a keypress in the very first
    // instants after load can be swallowed while hydration settles, so
    // establish interactivity before testing the keyboard shortcuts
    await pageInput(page).fill('50');
    await expect(page).toHaveURL(/page=50/);
    await page.locator('#image-container').click(); // move focus off the input
    await page.keyboard.press('ArrowRight');
    await expect(page).toHaveURL(/page=51/);
    await page.keyboard.press('ArrowLeft');
    await expect(page).toHaveURL(/page=50/);
    expect(await page.evaluate(() => localStorage.getItem('arbans_last_page'))).toBe('50');
  });

  test('reloading a bare / resumes at the last page read', async ({ page }) => {
    await page.goto('/');
    await pageInput(page).fill('50');
    await expect(page).toHaveURL(/page=50/);
    await page.goto('/');
    await expect(page).toHaveURL(/page=50/);
    await expect(pageInput(page)).toHaveValue('50');
  });

  test('out-of-range and garbage page params are handled', async ({ page }) => {
    await page.goto('/?page=9999');
    await expect(page).toHaveURL(/page=347/);
    await page.goto('/?page=-999');
    await expect(page).toHaveURL(/page=-7/);
    await page.goto('/?page=abc');
    // invalid param falls back to the saved page (-7 from the clamp above)
    await expect(page).toHaveURL(/page=-7/);
  });

  test('random exercise button syncs URL and storage', async ({ page }) => {
    await page.goto('/');
    await page.getByText('Give me something to practice').click();
    await expect(page).toHaveURL(/page=\d+/);
    const url = page.url();
    const pageNum = parseInt(url.match(/page=(-?\d+)/)![1], 10);
    expect(pageNum).toBeGreaterThanOrEqual(10);
    expect(await page.evaluate(() => localStorage.getItem('arbans_last_page'))).toBe(String(pageNum));
  });
});

test.describe('history timezone grouping', () => {
  // A timezone west of UTC makes UTC-vs-local date-key regressions observable
  test.use({ timezoneId: 'America/New_York' });

  test('late-evening practice groups under the local date', async ({ page }) => {
    await page.goto('/');
    // 11:30pm July 4 EDT is 3:30am July 5 UTC. UTC-keyed grouping (the old
    // bug) would file this under July 5.
    const ts = new Date('2026-07-04T23:30:00-04:00').getTime();
    await page.evaluate((t) => {
      localStorage.setItem('arbans_page_history', JSON.stringify([{ page: 42, timestamp: t }]));
    }, ts);
    await page.goto('/history');

    const heading = (await page.locator('main h2').last().textContent()) ?? '';
    // Relative labels apply when the test runs near the seeded date
    expect(
      /July 4/.test(heading) || ['Yesterday', 'Today'].includes(heading.trim())
    ).toBe(true);
    expect(heading).not.toContain('July 5');

    //

    // The calendar highlights July 4 as the auto-selected day
    await expect(page.locator('button.bg-blue-600', { hasText: '4' }).first()).toBeVisible();

    // Thumbnails use the viewer's URL scheme (page 42 + offset 7 = image 049)
    const thumbSrc = await page.locator('main img').first().getAttribute('src');
    expect(thumbSrc).toMatch(/\/page-049\.(png|webp|jpg)$/);

    // Clicking an entry navigates the viewer to that page
    await page.locator('main h3', { hasText: 'Page 42' }).first().click();
    await expect(page).toHaveURL(/page=42/);
  });
});

test.describe('sidebar defaults on mobile', () => {
  test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

  test('sidebar starts closed on phone-sized screens', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('div.bg-black.bg-opacity-50')).toHaveCount(0);
    await expect(page.locator('aside')).toHaveClass(/-translate-x-full/);
  });

  test('opened sidebar sits below the header (search box not covered)', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Toggle sidebar' }).tap();
    const search = page.getByPlaceholder('Search exercises or page #');
    await expect(search).toBeVisible();

    const headerBox = (await page.locator('header').boundingBox())!;
    const searchBox = (await search.boundingBox())!;
    expect(searchBox.y).toBeGreaterThanOrEqual(headerBox.y + headerBox.height);

    // and it's actually interactive: typing works with no element intercepting
    await search.tap();
    await search.fill('carnival');
    await expect(
      page.locator('[data-testid="toc-search-results"] button').first()
    ).toContainText('Carnival');
  });
});

test.describe('sidebar defaults on desktop', () => {
  test('sidebar starts open on desktop', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('aside')).toHaveClass(/translate-x-0/);
    await expect(page.getByText('Table of Contents')).toBeVisible();
  });
});
