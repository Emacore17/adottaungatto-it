import { type Page, expect, test } from '@playwright/test';

const mobileViewport = { width: 390, height: 844 };

const expectFocusInsideDialog = async (page: Page) => {
  await expect
    .poll(() =>
      page.evaluate(() => {
        const activeElement = document.activeElement;
        if (!(activeElement instanceof HTMLElement)) {
          return false;
        }

        return activeElement.closest('[role="dialog"]') !== null;
      }),
    )
    .toBeTruthy();
};

test('renders the scaffold home', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'Trova il gatto da accogliere.' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Vedi tutti gli annunci' }).first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Login' })).toBeVisible();
});

test('renders the functional login scaffold', async ({ page }) => {
  await page.goto('/login');

  await expect(page.getByRole('heading', { name: 'Accedi al tuo account' })).toBeVisible();
  const continueWithAccountLink = page.getByRole('link', { name: 'Continua con account' });
  if ((await continueWithAccountLink.count()) > 0) {
    await expect(continueWithAccountLink.first()).toBeVisible();
  } else {
    await expect(page.getByRole('button', { name: 'Continua con account' })).toBeVisible();
  }
});

test('shows session expired message on login', async ({ page }) => {
  await page.goto('/login?error=session_expired&next=%2Faccount');

  await expect(
    page.getByText('La sessione e scaduta. Accedi di nuovo per continuare.'),
  ).toBeVisible();
  await expect(page.getByRole('link', { name: 'Continua con account' })).toHaveAttribute(
    'href',
    '/api/auth/login?next=%2Faccount',
  );
});

test('applies italian locale params to OIDC login and register redirects', async ({ request }) => {
  const loginResponse = await request.get('/api/auth/login?next=%2Faccount', {
    maxRedirects: 0,
  });
  expect(loginResponse.status()).toBe(303);
  const loginLocation = loginResponse.headers().location ?? '';
  expect(loginLocation).toContain('ui_locales=it');
  expect(loginLocation).toContain('kc_locale=it');

  const registerResponse = await request.get('/api/auth/register?next=%2Faccount', {
    maxRedirects: 0,
  });
  expect(registerResponse.status()).toBe(303);
  const registerLocation = registerResponse.headers().location ?? '';
  expect(registerLocation).toContain('ui_locales=it');
  expect(registerLocation).toContain('kc_locale=it');
});

test('renders the public listings scaffold', async ({ page }) => {
  await page.goto('/annunci');

  await expect(page.getByRole('heading', { name: 'Annunci gatti da tutta Italia' })).toBeVisible();
});

test('explains login requirement from privacy manage preferences action', async ({ page }) => {
  await page.goto('/privacy');

  const managePreferencesLink = page.getByRole('link', {
    name: 'Accedi per gestire preferenze',
  });
  await expect(managePreferencesLink).toBeVisible();
  await expect(managePreferencesLink).toHaveAttribute(
    'href',
    '/login?next=%2Faccount%2Fimpostazioni',
  );
  await expect(
    page.getByText(
      'Per gestire consensi e preferenze del tuo account devi prima accedere; dopo il login verrai portato direttamente nelle impostazioni.',
    ),
  ).toBeVisible();
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

test('opens and closes the mobile navigation drawer', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');

  const menuToggle = page.getByRole('button', { name: 'Apri menu di navigazione' });
  await expect(menuToggle).toBeVisible();
  await menuToggle.click();

  const drawerDialog = page.getByRole('dialog', { name: 'Menu' });
  await expect(drawerDialog).toBeVisible();
  await expect(drawerDialog.getByRole('link', { exact: true, name: 'Annunci' })).toBeVisible();

  await drawerDialog.getByRole('button', { name: 'Chiudi menu di navigazione' }).last().click();
  await expect(drawerDialog).toBeHidden();
});

test('closes mobile navigation drawer on route change', async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto('/');

  const menuTrigger = page.getByRole('button', { name: 'Apri menu di navigazione' });
  await menuTrigger.click();

  const drawerDialog = page.getByRole('dialog', { name: 'Menu' });
  await expect(drawerDialog).toBeVisible();
  await drawerDialog.getByRole('link', { exact: true, name: 'Annunci' }).click();

  await expect.poll(() => new URL(page.url()).pathname).toBe('/annunci');
  await expect(drawerDialog).toBeHidden();
});

test('keeps keyboard focus trapped in mobile navigation drawer and restores trigger focus', async ({
  page,
}) => {
  await page.setViewportSize(mobileViewport);
  await page.goto('/');

  const menuTrigger = page.getByRole('button', { name: 'Apri menu di navigazione' });
  await expect(menuTrigger).toBeVisible();
  await menuTrigger.focus();
  await expect(menuTrigger).toBeFocused();

  await page.keyboard.press('Enter');

  const drawerDialog = page.getByRole('dialog', { name: 'Menu' });
  await expect(drawerDialog).toBeVisible();

  await page.keyboard.press('Tab');
  await expectFocusInsideDialog(page);

  await page.keyboard.press('Tab');
  await expectFocusInsideDialog(page);

  await page.keyboard.press('Shift+Tab');
  await expectFocusInsideDialog(page);

  await page.keyboard.press('Escape');
  await expect(drawerDialog).toBeHidden();
  await expect(menuTrigger).toBeFocused();
});

test('uses mobile home search inline filters and opens location sheet', async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto('/');

  const searchContainer = page.locator('.ricerca-container').first();
  const filtersButton = searchContainer.getByRole('button', { name: 'Filtri avanzati' });
  await expect(filtersButton).toBeVisible();
  await filtersButton.click();
  await expect(
    searchContainer.getByRole('button', { name: 'Cosa stai cercando?' }).first(),
  ).toBeVisible();

  await searchContainer.getByRole('button', { name: 'Cosa stai cercando?' }).first().click();
  await searchContainer
    .getByRole('button', { name: /^Adozione$/ })
    .first()
    .evaluate((node) => {
      (node as HTMLButtonElement).click();
    });

  await searchContainer.getByRole('button', { name: 'Sesso' }).first().click();
  await searchContainer
    .getByRole('button', { name: /^Femmina$/ })
    .first()
    .evaluate((node) => {
      (node as HTMLButtonElement).click();
    });

  const locationTrigger = searchContainer.getByRole('button', { name: /Dove/ }).first();
  await locationTrigger.click();

  const locationDialog = page.getByRole('dialog', { name: 'Dove' });
  await expect(locationDialog).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(locationDialog).toBeHidden();
  await expect(locationTrigger).toBeFocused();

  await searchContainer.getByRole('button', { exact: true, name: 'Cerca' }).click();

  await expect.poll(() => new URL(page.url()).searchParams.get('listingType')).toBe('adozione');
  await expect.poll(() => new URL(page.url()).searchParams.get('sex')).toBe('femmina');
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('relevance');
});

test('applies desktop home search filters to query params', async ({ page }) => {
  await page.goto('/');

  const searchContainer = page.locator('.ricerca-container').first();

  await searchContainer.getByRole('textbox', { name: 'Cerca gatti' }).fill('cucciolo roma');
  await searchContainer.getByRole('textbox', { name: 'Dove' }).fill('Roma');

  await searchContainer
    .getByRole('button', { name: /^Razza/ })
    .first()
    .evaluate((node) => {
      (node as HTMLButtonElement).click();
    });
  await page
    .getByRole('button', { name: /^Persiano$/ })
    .first()
    .evaluate((node) => {
      (node as HTMLButtonElement).click();
    });

  await searchContainer
    .getByRole('button', { name: /Cosa stai cercando\?/ })
    .first()
    .evaluate((node) => {
      (node as HTMLButtonElement).click();
    });
  await page
    .getByRole('button', { name: /^Adozione$/ })
    .first()
    .evaluate((node) => {
      (node as HTMLButtonElement).click();
    });

  await searchContainer
    .getByRole('button', { name: /^Sesso/ })
    .first()
    .evaluate((node) => {
      (node as HTMLButtonElement).click();
    });
  await page
    .getByRole('button', { name: /^Femmina$/ })
    .first()
    .evaluate((node) => {
      (node as HTMLButtonElement).click();
    });

  await searchContainer
    .getByRole('button', { name: /^Prezzo/ })
    .first()
    .evaluate((node) => {
      (node as HTMLButtonElement).click();
    });
  await page.locator('#price-min').selectOption('50');
  await page.locator('#price-max').selectOption('200');

  await searchContainer
    .getByRole('button', { name: /^Età del gatto/ })
    .first()
    .evaluate((node) => {
      (node as HTMLButtonElement).click();
    });
  await page.getByLabel('Età minima').selectOption('12');
  await page.getByLabel('Età massima').selectOption('24');

  await searchContainer
    .getByRole('button', { name: /^Ordina per/ })
    .first()
    .evaluate((node) => {
      (node as HTMLButtonElement).click();
    });
  await page
    .getByRole('button', { name: /^Prezzo crescente$/ })
    .first()
    .evaluate((node) => {
      (node as HTMLButtonElement).click();
    });

  await searchContainer.getByRole('button', { exact: true, name: 'Cerca' }).evaluate((node) => {
    (node as HTMLButtonElement).click();
  });

  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('cucciolo roma');
  await expect.poll(() => new URL(page.url()).searchParams.get('listingType')).toBe('adozione');
  await expect.poll(() => new URL(page.url()).searchParams.get('sex')).toBe('femmina');
  await expect.poll(() => new URL(page.url()).searchParams.get('breed')).toBe('Persiano');
  await expect.poll(() => new URL(page.url()).searchParams.get('priceMin')).toBe('50');
  await expect.poll(() => new URL(page.url()).searchParams.get('priceMax')).toBe('200');
  await expect.poll(() => new URL(page.url()).searchParams.get('ageMinMonths')).toBe('12');
  await expect.poll(() => new URL(page.url()).searchParams.get('ageMaxMonths')).toBe('24');
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('price_asc');
  await expect
    .poll(() => {
      const locationLabel = new URL(page.url()).searchParams.get('locationLabel');
      return typeof locationLabel === 'string' && locationLabel.toLowerCase().includes('roma');
    })
    .toBeTruthy();
});

test('does not render quick chips in mobile listings toolbar', async ({ page }) => {
  await page.setViewportSize(mobileViewport);
  await page.goto('/annunci');

  await expect(page.getByText('Filtri rapidi', { exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Vicino a me' })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Adozione' })).toBeHidden();
});

test('uses inline mobile selects for listing type, sex and breed in filters sheet', async ({
  page,
}) => {
  await page.setViewportSize(mobileViewport);
  await page.goto('/annunci');

  const filtersTrigger = page.getByRole('button', { name: 'Filtri' }).first();
  await filtersTrigger.click();

  const filtersDialog = page.getByRole('dialog').last();
  await expect(filtersDialog).toBeVisible();
  await expect(filtersDialog.getByText('Tipologia', { exact: true })).toBeVisible();
  await expect(filtersDialog.getByText('Sesso', { exact: true })).toBeVisible();

  await filtersDialog.getByRole('button', { name: 'Tutti i tipi' }).first().click();
  await filtersDialog.getByRole('button', { name: 'Adozione' }).first().click();

  await filtersDialog.getByRole('button', { name: 'Qualsiasi' }).first().click();
  await filtersDialog.getByRole('button', { name: 'Femmina' }).first().click();

  const breedField = filtersDialog.locator('div:has(> span:text-is("Razza"))').first();
  await breedField.getByRole('button').first().click();
  await filtersDialog.getByRole('button', { name: 'Non di razza' }).first().click();

  await filtersDialog
    .locator('form')
    .first()
    .evaluate((node) => {
      (node as HTMLFormElement).requestSubmit();
    });

  await expect.poll(() => new URL(page.url()).searchParams.get('listingType')).toBe('adozione');
  await expect.poll(() => new URL(page.url()).searchParams.get('sex')).toBe('femmina');
  await expect
    .poll(() => {
      const breed = new URL(page.url()).searchParams.get('breed');
      return typeof breed === 'string' && breed.length > 0;
    })
    .toBeTruthy();
});

test('keeps keyboard focus trapped in mobile filters sheet and closes with Escape', async ({
  page,
}) => {
  await page.setViewportSize(mobileViewport);
  await page.goto('/annunci');

  const filtersTrigger = page.getByRole('button', { name: 'Filtri' }).first();
  await expect(filtersTrigger).toBeVisible();
  await filtersTrigger.focus();
  await expect(filtersTrigger).toBeFocused();
  await page.keyboard.press('Enter');

  const filtersDialog = page.getByRole('dialog').last();
  await expect(filtersDialog).toBeVisible();

  await page.keyboard.press('Tab');
  await expectFocusInsideDialog(page);

  await page.keyboard.press('Tab');
  await expectFocusInsideDialog(page);

  await page.keyboard.press('Shift+Tab');
  await expectFocusInsideDialog(page);

  await page.keyboard.press('Escape');
  await expect(filtersDialog).toBeHidden();
  await expect(filtersTrigger).toBeFocused();
});

test('favorite button does not trigger card navigation in listings grid', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/annunci');

  const favoriteButton = page.locator('article button[aria-label*="preferiti"]').first();
  await expect(favoriteButton).toBeVisible();
  const initialUrl = page.url();
  await favoriteButton.click();

  await expect.poll(() => page.url()).toBe(initialUrl);
  await expect(favoriteButton).toHaveAttribute('aria-label', 'Rimuovi dai preferiti');
});

test('hides demo listings from public catalog', async ({ page }) => {
  await page.goto('/annunci');

  const demoCards = page.locator('article').filter({ hasText: '[DEMO' });
  await expect(demoCards).toHaveCount(0);
});

test('uses a not-found title for missing listing detail pages', async ({ page }) => {
  await page.goto('/annunci/99999');

  await expect(page).toHaveTitle('Annuncio non trovato | adottaungatto-it');
  await expect(
    page.getByRole('heading', { level: 1, name: '404 - Pagina non trovata' }),
  ).toBeVisible();
});

test('shows cat count in listing detail summary', async ({ page }) => {
  await page.goto('/annunci');

  const firstListingLink = page.locator('a[href^="/annunci/"]').first();
  await expect(firstListingLink).toBeVisible();
  const detailHref = await firstListingLink.getAttribute('href');
  expect(detailHref).toBeTruthy();

  await page.goto(detailHref as string);

  const summaryBlock = page.locator('[data-test-listing-summary]').first();
  await expect(summaryBlock.getByText('Numero gatti', { exact: true })).toBeVisible();
  await expect(summaryBlock.getByText(/^1 gatto$/)).toBeVisible();
});

test('keeps active listing filters when returning from detail page', async ({ page }) => {
  await page.goto('/annunci?sex=femmina&sort=price_asc');

  const firstListingLink = page.locator('a[href^="/annunci/"]').first();
  await expect(firstListingLink).toBeVisible();
  await firstListingLink.click();

  await expect(page.getByRole('link', { name: 'Torna agli annunci' })).toBeVisible();
  await page.getByRole('link', { name: 'Torna agli annunci' }).click();

  await expect.poll(() => new URL(page.url()).pathname).toBe('/annunci');
  await expect.poll(() => new URL(page.url()).searchParams.get('sex')).toBe('femmina');
  await expect.poll(() => new URL(page.url()).searchParams.get('sort')).toBe('price_asc');
});

test('renders breadcrumbs on privacy and listing detail pages', async ({ page }) => {
  await page.goto('/privacy');

  const privacyBreadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(privacyBreadcrumb).toBeVisible();
  await expect(privacyBreadcrumb.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(privacyBreadcrumb.getByText('Privacy', { exact: true })).toBeVisible();

  await page.goto('/annunci');
  const firstListingLink = page.locator('a[href^="/annunci/"]').first();
  await expect(firstListingLink).toBeVisible();
  const detailHref = await firstListingLink.getAttribute('href');
  expect(detailHref).toBeTruthy();
  await page.goto(detailHref as string);

  const detailBreadcrumb = page.getByRole('navigation', { name: 'Breadcrumb' });
  await expect(detailBreadcrumb).toBeVisible();
  await expect(detailBreadcrumb.getByRole('link', { name: 'Home' })).toBeVisible();
  await expect(detailBreadcrumb.getByRole('link', { name: 'Annunci' })).toBeVisible();
});

test('renders listing detail on mobile with gallery before title summary block', async ({
  page,
}) => {
  await page.setViewportSize(mobileViewport);
  await page.goto('/annunci');

  const firstListingLink = page.locator('a[href^="/annunci/"]').first();
  await expect(firstListingLink).toBeVisible();
  const detailHref = await firstListingLink.getAttribute('href');
  expect(detailHref).toBeTruthy();

  await page.goto(detailHref as string);

  const galleryBlock = page.locator('[data-test-listing-gallery]').first();
  const summaryBlock = page.locator('[data-test-listing-summary]').first();
  await expect(galleryBlock).toBeVisible();
  await expect(summaryBlock).toBeVisible();
  await expect(summaryBlock.getByRole('heading', { level: 1 }).first()).toBeVisible();

  const topPositions = await page.evaluate(() => {
    const gallery = document.querySelector('[data-test-listing-gallery]');
    const summary = document.querySelector('[data-test-listing-summary]');
    if (!(gallery instanceof HTMLElement) || !(summary instanceof HTMLElement)) {
      return null;
    }

    return {
      galleryTop: gallery.getBoundingClientRect().top,
      summaryTop: summary.getBoundingClientRect().top,
    };
  });

  expect(topPositions).not.toBeNull();
  if (!topPositions) {
    throw new Error('Posizioni gallery/summary non disponibili.');
  }
  expect(topPositions.galleryTop).toBeLessThan(topPositions.summaryTop);
});

test('keeps listings toolbar readable on tablet viewport without horizontal overflow', async ({
  page,
}) => {
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto('/annunci');

  await expect(page.getByRole('heading', { name: 'Annunci gatti da tutta Italia' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Filtri' }).first()).toBeVisible();
  await expect(page.getByText('Ordina per', { exact: true })).toBeVisible();

  const hasHorizontalOverflow = await page.evaluate(() => {
    return document.documentElement.scrollWidth > window.innerWidth + 1;
  });
  expect(hasHorizontalOverflow).toBeFalsy();
});

test('captures baseline screenshots for home, listings and listing detail', async ({
  page,
}, testInfo) => {
  const viewports = [
    { height: 800, name: 'mobile-360x800', width: 360 },
    { height: 844, name: 'mobile-390x844', width: 390 },
    { height: 1024, name: 'tablet-768x1024', width: 768 },
    { height: 720, name: 'desktop-1280x720', width: 1280 },
  ] as const;

  let detailPathname = '';

  for (const viewport of viewports) {
    await page.setViewportSize({
      width: viewport.width,
      height: viewport.height,
    });

    await page.goto('/');
    await expect(
      page.getByRole('heading', { name: 'Trova il gatto da accogliere.' }),
    ).toBeVisible();
    const homeScreenshot = testInfo.outputPath(`${viewport.name}-home.png`);
    await page.screenshot({ fullPage: true, path: homeScreenshot });
    await testInfo.attach(`${viewport.name}-home`, {
      path: homeScreenshot,
      contentType: 'image/png',
    });

    await page.goto('/annunci');
    await expect(
      page.getByRole('heading', { name: 'Annunci gatti da tutta Italia' }),
    ).toBeVisible();
    const listingsScreenshot = testInfo.outputPath(`${viewport.name}-annunci.png`);
    await page.screenshot({ fullPage: true, path: listingsScreenshot });
    await testInfo.attach(`${viewport.name}-annunci`, {
      path: listingsScreenshot,
      contentType: 'image/png',
    });

    if (!detailPathname) {
      const firstListingLink = page.locator('a[href^="/annunci/"]').first();
      await expect(firstListingLink).toBeVisible();
      const href = await firstListingLink.getAttribute('href');
      detailPathname = href ?? '';
    }

    expect(detailPathname).not.toBe('');
    await page.goto(detailPathname);
    await expect(page.locator('main h1').first()).toBeVisible();
    const detailScreenshot = testInfo.outputPath(`${viewport.name}-annuncio-dettaglio.png`);
    await page.screenshot({ fullPage: true, path: detailScreenshot });
    await testInfo.attach(`${viewport.name}-annuncio-dettaglio`, {
      path: detailScreenshot,
      contentType: 'image/png',
    });
  }
});
