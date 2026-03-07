import 'reflect-metadata';
import { loadWorkerEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { Pool } from 'pg';
import { buildOpsObservabilitySnapshot } from './ops-observability';

loadDotEnv({ path: '.env.local' });
loadDotEnv();

const run = async () => {
  const env = loadWorkerEnv();
  const pool = new Pool({
    connectionString: env.DATABASE_URL,
  });

  try {
    const snapshot = await buildOpsObservabilitySnapshot({
      env,
      pool,
    });

    console.log(JSON.stringify(snapshot, null, 2));
  } finally {
    await pool.end();
  }
};

run().catch((error: Error) => {
  console.error(`[ops:metrics] ${error.message}`);
  process.exit(1);
});
