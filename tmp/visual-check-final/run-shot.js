const { chromium } = require('@playwright/test');
(async () => {
  const browser = await chromium.launch({ headless: true });
  const targets = [
    { name: 'home-desktop', url: 'http://localhost:3200/', viewport: { width: 1440, height: 900 } },
    { name: 'home-mobile', url: 'http://localhost:3200/', viewport: { width: 390, height: 844 } },
    { name: 'cerca-desktop', url: 'http://localhost:3200/cerca', viewport: { width: 1440, height: 900 } },
    { name: 'cerca-mobile', url: 'http://localhost:3200/cerca', viewport: { width: 390, height: 844 } },
  ];
  try {
    for (const t of targets) {
      const context = await browser.newContext({ viewport: t.viewport });
      const page = await context.newPage();
      await page.goto(t.url, { waitUntil: 'networkidle' });
      await page.waitForTimeout(1400);
      const file = 'C:/Users/emanu/Documents/progetti/adottaungatto-it/tmp/visual-check-final/' + t.name + '.png';
      await page.screenshot({ path: file, fullPage: true });
      console.log(file);
      await context.close();
    }
  } finally {
    await browser.close();
  }
})();
