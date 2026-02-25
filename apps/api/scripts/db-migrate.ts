import { loadApiEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';

loadDotEnv({ path: '.env.local' });
loadDotEnv();
const env = loadApiEnv();

console.log('[db:migrate] Placeholder migration runner.');
console.log(`[db:migrate] Target DB: ${env.DATABASE_URL}`);
