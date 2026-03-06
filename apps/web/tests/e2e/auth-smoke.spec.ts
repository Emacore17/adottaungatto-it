import { expect, test } from '@playwright/test';

const authSmokeEnabled = process.env.E2E_WEB_AUTH_SMOKE === '1';

test.describe('web auth smoke', () => {
  test.skip(
    !authSmokeEnabled,
    'Set E2E_WEB_AUTH_SMOKE=1 to run auth flow smoke tests (requires API + Keycloak).',
  );

  test('redirects unauthenticated users from account to login preserving next', async ({ page }) => {
    await page.goto('/account');

    await expect.poll(() => new URL(page.url()).pathname).toBe('/login');
    await expect.poll(() => new URL(page.url()).searchParams.get('next')).toBe('/account');
  });

  test('supports demo user login and logout session flow', async ({ page }) => {
    await page.goto('/login');

    const continueWithAccountLink = page.getByRole('link', { name: 'Continua con account' });
    if ((await continueWithAccountLink.count()) > 0) {
      await continueWithAccountLink.first().click();
    } else {
      await page.getByRole('button', { name: 'Continua con account' }).click();
    }

    await expect
      .poll(() => {
        const url = new URL(page.url());
        return url.port === '8080' || url.pathname === '/account';
      })
      .toBeTruthy();

    if (new URL(page.url()).port === '8080') {
      await page.locator('input[name="username"]').fill('utente.demo');
      await page.locator('input[name="password"]').fill('demo1234');
      await page.locator('#kc-login').click();
    }

    await expect.poll(() => new URL(page.url()).pathname).toBe('/account');
    await expect(page.getByRole('heading', { name: 'Il tuo account' })).toBeVisible();

    await expect(page.getByRole('button', { name: /Logout|Uscita/ }).first()).toBeVisible();
    const logoutResponse = await page.request.post('/api/auth/logout', {
      headers: {
        'x-auth-mode': 'spa',
        Origin: 'http://localhost:3000',
        Referer: 'http://localhost:3000/account',
      },
    });
    expect([200, 303]).toContain(logoutResponse.status());

    await page.goto('/account');
    await expect.poll(() => new URL(page.url()).pathname, { timeout: 20_000 }).toBe('/login');
  });
});
