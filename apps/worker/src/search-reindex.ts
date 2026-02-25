import { loadWorkerEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';

loadDotEnv({ path: '.env.local' });
loadDotEnv();
const env = loadWorkerEnv();

console.log(`[search:reindex] Placeholder reindex runner on ${env.OPENSEARCH_URL}`);
