import { expect, test } from '@playwright/test';

test('renders the scaffold home', async ({ page }) => {
  await page.goto('/');

  await expect(
    page.getByRole('heading', { name: 'Frontend web azzerato e pronto da ricostruire.' }),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Apri annunci' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Vai al login' })).toBeVisible();
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
