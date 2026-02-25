import { loadApiEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';

loadDotEnv({ path: '.env.local' });
loadDotEnv();

const env = loadApiEnv();

const username = process.argv[2] ?? 'utente.demo';
const password = process.argv[3] ?? 'demo1234';
const clientId = process.argv[4] ?? env.KEYCLOAK_CLIENT_ID_WEB;

const tokenUrl = `${env.KEYCLOAK_URL.replace(/\/$/, '')}/realms/${env.KEYCLOAK_REALM}/protocol/openid-connect/token`;

const run = async () => {
  const formData = new URLSearchParams();
  formData.set('grant_type', 'password');
  formData.set('client_id', clientId);
  formData.set('username', username);
  formData.set('password', password);
  formData.set('scope', 'openid profile email');

  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formData,
  });

  if (!response.ok) {
    const payload = await response.text();
    throw new Error(`Token request failed with status ${response.status}: ${payload}`);
  }

  const payload = (await response.json()) as { access_token: string };
  console.log(payload.access_token);
};

run().catch((error: Error) => {
  console.error(`[keycloak:get-token] ${error.message}`);
  process.exit(1);
});
