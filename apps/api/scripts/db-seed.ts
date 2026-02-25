import { loadApiEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';

loadDotEnv({ path: '.env.local' });
loadDotEnv();
const env = loadApiEnv();

console.log('[db:seed] Placeholder seed runner.');
console.log(`[db:seed] Target DB: ${env.DATABASE_URL}`);
