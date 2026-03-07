import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(fileURLToPath(new URL('..', import.meta.url)));
const specPath = resolve(packageRoot, 'openapi/openapi.v1.json');
const generatedPath = resolve(packageRoot, 'src/generated/openapi.ts');

const tempDir = mkdtempSync(join(tmpdir(), 'adottaungatto-openapi-'));
const tempOutputPath = join(tempDir, 'openapi.ts');

try {
  execFileSync('openapi-typescript', [specPath, '-o', tempOutputPath], {
    cwd: packageRoot,
    stdio: 'pipe',
  });

  const expected = readFileSync(generatedPath, 'utf8');
  const actual = readFileSync(tempOutputPath, 'utf8');

  if (expected !== actual) {
    process.stderr.write(
      '[openapi:check] Drift detected: regenerate SDK types with `pnpm openapi:generate`.\n',
    );
    process.exit(1);
  }

  process.stdout.write('[openapi:check] OpenAPI generated types are up to date.\n');
} finally {
  rmSync(tempDir, { recursive: true, force: true });
}
