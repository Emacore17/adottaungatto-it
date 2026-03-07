import 'reflect-metadata';
import { loadWorkerEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { Pool } from 'pg';
import { buildOpsObservabilitySnapshot, evaluateOpsAlerts } from './ops-observability';

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
    const report = evaluateOpsAlerts({
      snapshot,
      env,
    });

    console.log(
      JSON.stringify(
        {
          report,
          snapshot,
        },
        null,
        2,
      ),
    );

    if (report.shouldFail) {
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
};

run().catch((error: Error) => {
  console.error(`[ops:alerts] ${error.message}`);
  process.exit(1);
});
