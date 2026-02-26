import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { chromium } from '@playwright/test';

const root = process.cwd();
const webDir = path.join(root, 'apps', 'web');
const outDir = path.join(root, 'tmp', 'visual-check');
const port = 3200;
const baseUrl = `http://127.0.0.1:${port}`;

const routes = [
  '/',
  '/cerca',
  '/annunci/mock-milo-torino-001',
];

const viewports = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 390, height: 844 },
];

const slug = (route) => {
  if (route === '/') return 'home';
  return route.replace(/^\//, '').replace(/[\/]/g, '__').replace(/[^a-zA-Z0-9_-]/g, '-');
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForHttpReady(url, timeoutMs = 120000) {
  const start = Date.now();
  let lastError = null;

  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.status < 500) return;
      lastError = new Error(`HTTP ${res.status}`);
    } catch (error) {
      lastError = error;
    }
    await sleep(1000);
  }

  throw new Error(`Timeout waiting for ${url}: ${lastError?.message ?? 'unknown error'}`);
}

function startDevServer() {
  const child = spawn(
    process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm',
    ['exec', 'next', 'dev', '-p', String(port)],
    {
      cwd: webDir,
      env: { ...process.env, PORT: String(port), NODE_ENV: 'development' },
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  child.stdout.on('data', (chunk) => process.stdout.write(`[next] ${chunk}`));
  child.stderr.on('data', (chunk) => process.stderr.write(`[next:err] ${chunk}`));
  return child;
}

async function stopProcess(child) {
  if (!child || child.killed || child.exitCode !== null) return;

  child.kill('SIGINT');
  for (let i = 0; i < 20; i += 1) {
    if (child.exitCode !== null) return;
    await sleep(250);
  }

  child.kill('SIGTERM');
  for (let i = 0; i < 20; i += 1) {
    if (child.exitCode !== null) return;
    await sleep(250);
  }

  child.kill('SIGKILL');
}

let devServer;
let browser;
const generated = [];

try {
  await mkdir(outDir, { recursive: true });

  devServer = startDevServer();
  await waitForHttpReady(baseUrl, 180000);

  browser = await chromium.launch({ headless: true });

  for (const viewport of viewports) {
    const context = await browser.newContext({ viewport: { width: viewport.width, height: viewport.height } });
    const page = await context.newPage();

    for (const route of routes) {
      const url = `${baseUrl}${route}`;
      await page.goto(url, { waitUntil: 'networkidle', timeout: 120000 });
      await page.waitForTimeout(700);

      const fileName = `${slug(route)}-${viewport.name}-${viewport.width}x${viewport.height}.png`;
      const filePath = path.join(outDir, fileName);
      await page.screenshot({ path: filePath, fullPage: true });
      generated.push(filePath);
      console.log(`[shot] ${filePath}`);
    }

    await context.close();
  }

  const reportPath = path.join(outDir, 'report.json');
  await writeFile(reportPath, JSON.stringify({ baseUrl, port, generated }, null, 2), 'utf8');
  generated.push(reportPath);

  console.log('\nGenerated files:');
  for (const file of generated) console.log(file);
} catch (error) {
  console.error(`\nERROR: ${error?.stack || error}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close().catch(() => {});
  if (devServer) await stopProcess(devServer);
}
