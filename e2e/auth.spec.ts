import { test, expect } from '@playwright/test';

// /auth/callback redirects to /?auth_error=1 when a sign-in link fails
// (expired or already used); the viewer explains and offers a new link.

test('a failed sign-in link reopens the dialog with an explanation', async ({ page }) => {
  await page.goto('/?auth_error=1');

  await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  await expect(page.getByText('That sign-in link has expired or was already used')).toBeVisible();
  // The param is consumed so a reload doesn't show the error again
  await expect(page).not.toHaveURL(/auth_error/);
});

test('the callback route reports an error param from Supabase', async ({ request }) => {
  const res = await request.get('/auth/callback?error=access_denied&error_code=otp_expired', {
    maxRedirects: 0,
  });
  expect(res.status()).toBe(307);
  expect(res.headers()['location']).toMatch(/\/\?auth_error=1$/);
});

test('the callback route without a code or error just goes home', async ({ request }) => {
  const res = await request.get('/auth/callback', { maxRedirects: 0 });
  expect(res.headers()['location']).toMatch(/\/$/);
});
