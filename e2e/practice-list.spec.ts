import { test, expect } from '@playwright/test';

// Lists as a practice tool: the sidebar's "My lists" link opens the panel,
// opening an exercise starts a practice session, and the practice bar steps
// through the list's items in order (across books). The lists API is mocked
// (no Supabase in e2e builds).

const LIST = { id: 'l1', name: 'Warm-ups', created_at: '', updated_at: '', user_id: 'u1' };
const ITEMS = [
  { id: 'i1', list_id: 'l1', page_number: 11, book_id: 'arban', title: 'Zephyr Warm-up', created_at: '2026-07-01T00:00:00Z' },
  { id: 'i2', list_id: 'l1', page_number: 50, book_id: 'arban', title: null, created_at: '2026-07-01T00:00:00Z' },
  { id: 'i3', list_id: 'l1', page_number: 5, book_id: 'testbook', title: 'Quux Etude', created_at: '2026-07-01T00:00:00Z' },
];

test('practice a list from the sidebar, stepping through items', async ({ page }) => {
  await page.route('**/api/lists', route =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { lists: [LIST] } })
      : route.fallback()
  );
  await page.route('**/api/list-items?list_id=l1', route =>
    route.fulfill({ json: { items: ITEMS } })
  );

  await page.goto('/?page=100');

  // Lists are one click away in the sidebar
  await page.getByRole('button', { name: 'My lists' }).click();
  await page.getByRole('button', { name: /Warm-ups/ }).click();

  // Opening an item starts practicing at that item
  await page.getByRole('button', { name: /Zephyr Warm-up/ }).click();
  const bar = page.locator('[data-testid="practice-bar"]');
  await expect(bar).toBeVisible();
  await expect(bar).toContainText('Warm-ups');
  await expect(bar).toContainText('1 / 3');
  await expect(page).toHaveURL(/page=11/);

  // Next steps through the list, including into another book
  await bar.getByTitle('Next exercise in the list').click();
  await expect(bar).toContainText('2 / 3');
  await expect(page).toHaveURL(/page=50/);
  await bar.getByTitle('Next exercise in the list').click();
  await expect(bar).toContainText('3 / 3');
  await expect(page).toHaveURL(/book=testbook/);
  await expect(page).toHaveURL(/page=5/);
  await expect(bar.getByTitle('Next exercise in the list')).toBeDisabled();

  // Manual page turns don't kick you out; prev jumps back into sequence
  await page.locator('#image-container').click();
  await page.keyboard.press('ArrowRight');
  await expect(page).toHaveURL(/page=6/);
  await expect(bar).toBeVisible();
  await bar.getByTitle('Previous exercise in the list').click();
  await expect(bar).toContainText('2 / 3');
  await expect(page).toHaveURL(/page=50/);

  // The session survives a reload
  await page.reload();
  await expect(page.locator('[data-testid="practice-bar"]')).toContainText('2 / 3');

  // Exit removes the bar
  await page.getByLabel('Stop practicing this list').click();
  await expect(page.locator('[data-testid="practice-bar"]')).toHaveCount(0);
});

test('practice button starts from the first item', async ({ page }) => {
  await page.route('**/api/lists', route =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { lists: [LIST] } })
      : route.fallback()
  );
  await page.route('**/api/list-items?list_id=l1', route =>
    route.fulfill({ json: { items: ITEMS } })
  );

  await page.goto('/?page=100');
  await page.getByRole('button', { name: 'My lists' }).click();
  await page.getByRole('button', { name: /Warm-ups/ }).click();
  await page.getByRole('button', { name: 'Practice', exact: true }).click();

  const bar = page.locator('[data-testid="practice-bar"]');
  await expect(bar).toContainText('1 / 3');
  await expect(page).toHaveURL(/page=11/);
});

test('reordering items persists and practice follows the new order', async ({ page }) => {
  let reorderPayload: { list_id: string; item_ids: string[] } | null = null;
  await page.route('**/api/lists', route =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { lists: [LIST] } })
      : route.fallback()
  );
  await page.route('**/api/list-items?list_id=l1', route =>
    route.fulfill({ json: { items: ITEMS } })
  );
  await page.route('**/api/list-items/reorder', route => {
    reorderPayload = route.request().postDataJSON();
    return route.fulfill({ json: { message: 'Order saved' } });
  });

  await page.goto('/?page=100');
  await page.getByRole('button', { name: 'My lists' }).click();
  await page.getByRole('button', { name: /Warm-ups/ }).click();
  await expect(page.getByRole('button', { name: /Zephyr Warm-up/ })).toBeVisible();

  // Move the first item down: order becomes i2, i1, i3
  await page.getByLabel('Move down').first().click();
  await expect.poll(() => reorderPayload).not.toBeNull();
  expect(reorderPayload!.list_id).toBe('l1');
  expect(reorderPayload!.item_ids).toEqual(['i2', 'i1', 'i3']);

  // The first item can no longer move up; practice follows the new order
  await expect(page.getByLabel('Move up').first()).toBeDisabled();
  await page.getByRole('button', { name: 'Practice', exact: true }).click();
  const bar = page.locator('[data-testid="practice-bar"]');
  await expect(bar).toContainText('1 / 3');
  await expect(page).toHaveURL(/page=50/); // i2 is now first
  await bar.getByTitle('Next exercise in the list').click();
  await expect(page).toHaveURL(/page=11/); // then i1
});

test("printing a list uses the list's book images, not the open book's", async ({ page, context }) => {
  await context.addInitScript(() => {
    window.print = () => {};
  });
  const testbookList = { ...LIST, id: 'l2', name: 'Quux studies' };
  await page.route('**/api/lists', route =>
    route.request().method() === 'GET'
      ? route.fulfill({ json: { lists: [testbookList] } })
      : route.fallback()
  );
  await page.route('**/api/list-items?list_id=l2', route =>
    route.fulfill({
      json: {
        items: [
          { id: 'q1', list_id: 'l2', page_number: 5, book_id: 'testbook', title: 'Quux Etude', created_at: '2026-07-01T00:00:00Z' },
          { id: 'q2', list_id: 'l2', page_number: 6, book_id: 'testbook', title: null, created_at: '2026-07-01T00:00:00Z' },
        ],
      },
    })
  );

  await page.goto('/?page=50'); // viewing Arban's
  await page.getByRole('button', { name: 'My lists' }).click();
  await page.getByRole('button', { name: /Quux studies/ }).click();
  await page.getByTitle('Print pages from this list').click();
  await page.getByRole('button', { name: 'Print', exact: true }).click();

  const printedSrcs = () =>
    page.evaluate(() => {
      const frames = document.querySelectorAll('iframe[aria-hidden="true"]');
      const f = frames[frames.length - 1] as HTMLIFrameElement | undefined;
      return Array.from(f?.contentDocument?.images ?? []).map(i => i.getAttribute('src') ?? '');
    });
  await expect.poll(printedSrcs).toHaveLength(2);
  const srcs = await printedSrcs();
  for (const src of srcs) expect(src).toMatch(/\/testbook\/page-\d{3}\.png$/);
});

test('create and rename a list', async ({ page }) => {
  let lists = [LIST];
  await page.route('**/api/lists', async route => {
    const req = route.request();
    if (req.method() === 'GET') return route.fulfill({ json: { lists } });
    const body = req.postDataJSON();
    if (req.method() === 'POST') {
      const list = { ...LIST, id: 'l9', name: body.name };
      lists = [list, ...lists];
      return route.fulfill({ json: { list } });
    }
    if (req.method() === 'PATCH') {
      const list = { ...lists.find(l => l.id === body.list_id)!, name: body.name };
      lists = lists.map(l => (l.id === list.id ? list : l));
      return route.fulfill({ json: { list } });
    }
    return route.fallback();
  });

  await page.goto('/?page=50');
  await page.getByRole('button', { name: 'My lists' }).click();

  await page.getByRole('button', { name: '+ Create New List' }).click();
  await page.getByPlaceholder('e.g., Best Tonguing Exercises').fill('Lip slurs');
  await page.getByRole('button', { name: 'Create List' }).click();
  await expect(page.getByRole('button', { name: 'Lip slurs' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Warm-ups' })).toBeVisible();

  // Rename in place; Enter saves and leaves edit mode
  await page.getByTitle('Rename list').nth(1).click();
  const input = page.locator('input[maxlength="100"]');
  await input.fill('Morning warm-ups');
  await input.press('Enter');
  await expect(page.getByRole('button', { name: 'Morning warm-ups' })).toBeVisible();
  await expect(input).toHaveCount(0);
});
