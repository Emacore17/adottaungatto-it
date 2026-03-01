import { expect, test } from '@playwright/test';

test('renders the scaffold home', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Trova il tuo prossimo gatto.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Apri tutti gli annunci' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
});

test('renders the functional login scaffold', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Accedi allo scaffold web' })).toBeVisible();
  await expect(page.getByLabel('Username')).toBeVisible();
  await expect(page.getByLabel('Password')).toBeVisible();
});

test('renders the public listings scaffold', async ({ page }) => {
  await page.goto('/annunci');

  await expect(page.getByRole('heading', { name: 'Annunci pubblici' })).toBeVisible();
});

test('switches between light and dark theme tokens', async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('theme', 'light');
  });

  await page.goto('/');

  const root = page.locator('html');
  await expect(root).not.toHaveClass(/dark/);
  await expect(page.getByRole('button', { name: 'Passa al tema scuro' })).toBeVisible();

  const lightCanvas = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-bg-canvas').trim(),
  );
  expect(lightCanvas).toBe('#fbf7f4');

  await page.getByRole('button', { name: 'Passa al tema scuro' }).click();

  await expect(root).toHaveClass(/dark/);
  await expect(page.getByRole('button', { name: 'Passa al tema chiaro' })).toBeVisible();

  const darkCanvas = await page.evaluate(() =>
    getComputedStyle(document.documentElement).getPropertyValue('--color-bg-canvas').trim(),
  );
  expect(darkCanvas).toBe('#171215');
});
