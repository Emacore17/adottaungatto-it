#!/usr/bin/env node

const baseUrl = process.env.AUTH_PAGES_BASE_URL ?? 'http://localhost:3000';
const targets = ['/login', '/registrati', '/password-dimenticata', '/verifica-account'];

const toUrl = (path) => new URL(path, baseUrl).toString();

const run = async () => {
  const failures = [];

  for (const path of targets) {
    const url = toUrl(path);
    try {
      const response = await fetch(url, {
        redirect: 'follow',
      });

      const ok = response.status >= 200 && response.status < 400;
      process.stdout.write(`[auth-pages-smoke] ${path} -> ${response.status}\n`);

      if (!ok) {
        failures.push(`${path} returned status ${response.status}`);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      failures.push(`${path} request failed: ${message}`);
      process.stdout.write(`[auth-pages-smoke] ${path} -> request failed\n`);
    }
  }

  if (failures.length > 0) {
    process.stderr.write('[auth-pages-smoke] failed checks:\n');
    for (const failure of failures) {
      process.stderr.write(`- ${failure}\n`);
    }
    process.exit(1);
  }

  process.stdout.write('[auth-pages-smoke] all auth pages are reachable.\n');
};

await run();
