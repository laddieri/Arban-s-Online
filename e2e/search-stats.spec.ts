import { test, expect } from '@playwright/test';

// TOC search and practice stats.

test.describe('TOC search', () => {
  test('finds exercises by name and number', async ({ page }) => {
    await page.goto('/');
    const search = page.getByPlaceholder('Search exercises or page #');
    await search.fill('characteristic 2');

    const results = page.locator('[data-testid="toc-search-results"] button');
    await expect(results.first()).toContainText('#2');
    await expect(results.first()).toContainText('Characteristic Studies');
    await results.first().click();
    await expect(page).toHaveURL(/page=286/);
    // Search clears and the tree returns after navigating
    await expect(page.getByText('First Studies').first()).toBeVisible();
  });

  test('jumps straight to a page number with Enter', async ({ page }) => {
    await page.goto('/');
    const search = page.getByPlaceholder('Search exercises or page #');
    await search.fill('120');
    await expect(
      page.locator('[data-testid="toc-search-results"] button').first()
    ).toContainText('Go to page 120');
    await search.press('Enter');
    await expect(page).toHaveURL(/page=120/);
  });

  test('handles Roman numeral preface pages and gibberish', async ({ page }) => {
    await page.goto('/');
    const search = page.getByPlaceholder('Search exercises or page #');
    await search.fill('iv');
    await search.press('Enter');
    await expect(page).toHaveURL(/page=-4/);

    await search.fill('zzzqqq');
    await expect(page.getByText('No matches')).toBeVisible();
  });
});

test.describe('practice stats', () => {
  test('history page shows streak, day counts, and most-practiced pages', async ({ page }) => {
    await page.goto('/');
    // Seed a 3-day practice run: today, yesterday, and two days ago.
    // Anchored to local noon, not Date.now(): near midnight, "now - 1h"
    // lands on yesterday and collapses the run to 2 distinct days.
    await page.evaluate(() => {
      const noon = new Date();
      noon.setHours(12, 0, 0, 0);
      const t = noon.getTime();
      const day = 86400000;
      localStorage.setItem(
        'arbans_page_history',
        JSON.stringify([
          { page: 50, timestamp: t },
          { page: 50, timestamp: t - day },
          { page: 60, timestamp: t - day - 3600000 },
          { page: 50, timestamp: t - 2 * day },
        ])
      );
    });
    await page.goto('/history');

    const stats = page.locator('[data-testid="practice-stats"]');
    await expect(stats).toBeVisible();

    const streakTile = stats.locator('> div').filter({ hasText: 'Current Streak' });
    await expect(streakTile).toContainText(/3\s*days/);

    const daysTile = stats.locator('> div').filter({ hasText: 'Days Practiced' });
    await expect(daysTile).toContainText(/3\s*of 30/);

    const pagesTile = stats.locator('> div').filter({ hasText: 'Pages Explored' });
    await expect(pagesTile).toContainText('2');

    // Page 50 viewed 3x tops the list; clicking it opens the viewer there
    const topTile = stats.locator('> div').filter({ hasText: 'Most Practiced' });
    await expect(topTile.getByRole('button').first()).toContainText('Page 50');
    await expect(topTile.getByRole('button').first()).toContainText('3×');
    await topTile.getByRole('button').first().click();
    await expect(page).toHaveURL(/page=50/);
  });
});
