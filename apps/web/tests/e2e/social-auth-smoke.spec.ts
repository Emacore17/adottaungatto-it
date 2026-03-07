import { expect, test } from '@playwright/test';

const socialSmokeEnabled = process.env.E2E_WEB_SOCIAL_SMOKE === '1';
const socialProviderAlias = (process.env.E2E_WEB_SOCIAL_PROVIDER ?? 'google').trim().toLowerCase();

const resolveKeycloakHost = (): string => {
  try {
    return new URL(process.env.KEYCLOAK_URL ?? 'http://localhost:8080').host;
  } catch {
    return 'localhost:8080';
  }
};

test.describe('web social auth fallback', () => {
  test('redirects unavailable login provider to login with error code', async ({ page }) => {
    await page.goto('/api/auth/login/non-existent-provider?next=%2Faccount');

    await expect.poll(() => new URL(page.url()).pathname).toBe('/login');
    await expect.poll(() => new URL(page.url()).searchParams.get('error')).toBe(
      'social_provider_unavailable',
    );
    await expect.poll(() => new URL(page.url()).searchParams.get('next')).toBe('/account');
  });

  test('redirects unavailable register provider to register with error code', async ({ page }) => {
    await page.goto('/api/auth/register/non-existent-provider?next=%2Fverifica-account');

    await expect.poll(() => new URL(page.url()).pathname).toBe('/registrati');
    await expect.poll(() => new URL(page.url()).searchParams.get('error')).toBe(
      'social_provider_unavailable',
    );
    await expect.poll(() => new URL(page.url()).searchParams.get('next')).toBe('/verifica-account');
  });
});

test.describe('web social auth smoke', () => {
  test.skip(
    !socialSmokeEnabled,
    'Set E2E_WEB_SOCIAL_SMOKE=1 to run social provider smoke tests (requires Keycloak + provider allow-list).',
  );

  test('login social route redirects to OIDC auth endpoint with provider hint', async ({ page }) => {
    const keycloakHost = resolveKeycloakHost();
    const response = await page.request.fetch(
      `/api/auth/login/${socialProviderAlias}?next=%2Faccount`,
      {
        maxRedirects: 0,
      },
    );

    expect(response.status()).toBe(303);
    const location = response.headers()['location'];
    expect(location).toBeTruthy();

    const redirectUrl = new URL(location as string);
    expect(redirectUrl.host).toBe(keycloakHost);
    expect(redirectUrl.pathname.endsWith('/protocol/openid-connect/auth')).toBeTruthy();
    expect(redirectUrl.searchParams.get('kc_idp_hint')).toBe(socialProviderAlias);
  });

  test('register social route forwards signup params and provider hint', async ({ page }) => {
    const keycloakHost = resolveKeycloakHost();
    const response = await page.request.fetch(
      `/api/auth/register/${socialProviderAlias}?next=%2Fverifica-account`,
      {
        maxRedirects: 0,
      },
    );

    expect(response.status()).toBe(303);
    const location = response.headers()['location'];
    expect(location).toBeTruthy();

    const redirectUrl = new URL(location as string);
    expect(redirectUrl.host).toBe(keycloakHost);
    expect(redirectUrl.pathname.endsWith('/protocol/openid-connect/auth')).toBeTruthy();
    expect(redirectUrl.searchParams.get('kc_idp_hint')).toBe(socialProviderAlias);
    expect(redirectUrl.searchParams.get('screen_hint')).toBe('signup');
    expect(redirectUrl.searchParams.get('kc_action')).toBe('register');
  });
});
