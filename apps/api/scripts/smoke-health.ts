const apiUrl = process.env.API_SMOKE_URL ?? 'http://127.0.0.1:3002';

const run = async () => {
  const response = await fetch(`${apiUrl}/health`);
  if (!response.ok) {
    throw new Error(`Health endpoint failed with status ${response.status}`);
  }

  const payload = await response.json();
  if (payload.status !== 'ok') {
    throw new Error(`Unexpected health payload: ${JSON.stringify(payload)}`);
  }

  console.log('[test:smoke] API health check passed.');
};

run().catch((error: Error) => {
  console.error(`[test:smoke] ${error.message}`);
  process.exit(1);
});
