import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, readdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { loadApiEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { Client } from 'pg';

type MigrationFile = {
  name: string;
  fullPath: string;
  sql: string;
  checksum: string;
};

const schemaMigrationsTableSql = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    checksum TEXT NOT NULL,
    executed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
  );
`;

const resolveMigrationsDirectory = (): string => {
  const localMigrationsPath = resolve(process.cwd(), 'migrations');
  if (existsSync(localMigrationsPath)) {
    return localMigrationsPath;
  }

  return resolve(process.cwd(), 'apps/api/migrations');
};

const computeChecksum = (value: string): string => createHash('sha256').update(value).digest('hex');

const listMigrationFiles = async (migrationsDir: string): Promise<MigrationFile[]> => {
  const files = await readdir(migrationsDir);
  const sqlFiles = files.filter((fileName) => fileName.endsWith('.sql')).sort();

  const migrations: MigrationFile[] = [];
  for (const fileName of sqlFiles) {
    const fullPath = resolve(migrationsDir, fileName);
    const sql = await readFile(fullPath, 'utf8');
    migrations.push({
      name: fileName,
      fullPath,
      sql,
      checksum: computeChecksum(sql),
    });
  }

  return migrations;
};

const run = async () => {
  loadDotEnv({ path: '.env.local' });
  loadDotEnv();

  const env = loadApiEnv();
  const migrationsDir = resolveMigrationsDirectory();
  const migrations = await listMigrationFiles(migrationsDir);

  if (migrations.length === 0) {
    console.log('[db:migrate] No migration files found.');
    return;
  }

  const client = new Client({
    connectionString: env.DATABASE_URL,
  });

  await client.connect();
  console.log(`[db:migrate] Connected to ${env.DATABASE_URL}`);
  console.log(`[db:migrate] Using directory: ${migrationsDir}`);

  try {
    await client.query(schemaMigrationsTableSql);

    const appliedRows = await client.query<{
      name: string;
      checksum: string;
    }>('SELECT name, checksum FROM schema_migrations ORDER BY name ASC');

    const appliedByName = new Map(appliedRows.rows.map((row) => [row.name, row.checksum]));

    let appliedCount = 0;

    for (const migration of migrations) {
      const appliedChecksum = appliedByName.get(migration.name);
      if (appliedChecksum) {
        if (appliedChecksum !== migration.checksum) {
          throw new Error(`Checksum mismatch for already applied migration "${migration.name}".`);
        }

        console.log(`[db:migrate] Skip ${migration.name} (already applied).`);
        continue;
      }

      console.log(`[db:migrate] Applying ${migration.name}...`);
      await client.query('BEGIN');

      try {
        await client.query(migration.sql);
        await client.query('INSERT INTO schema_migrations (name, checksum) VALUES ($1, $2)', [
          migration.name,
          migration.checksum,
        ]);
        await client.query('COMMIT');
        appliedCount += 1;
      } catch (error) {
        await client.query('ROLLBACK');
        throw new Error(
          `Migration failed (${migration.name} at ${migration.fullPath}): ${(error as Error).message}`,
        );
      }
    }

    console.log(`[db:migrate] Done. Applied ${appliedCount} migration(s).`);
  } finally {
    await client.end();
  }
};

run().catch((error: Error) => {
  console.error(`[db:migrate] ${error.message}`);
  process.exit(1);
});
