import { loadWorkerEnv } from '@adottaungatto/config';
import { config as loadDotEnv } from 'dotenv';
import { createWorkerMinioClient, pingWorkerMinioBucket } from './minio-client';

const run = async () => {
  loadDotEnv({ path: '.env.local' });
  loadDotEnv();

  const env = loadWorkerEnv();
  const minioClient = createWorkerMinioClient(env);

  try {
    await pingWorkerMinioBucket(minioClient, env.MINIO_BUCKET_LISTING_ORIGINALS);
    console.log(`[worker:smoke:minio] OK (${env.MINIO_BUCKET_LISTING_ORIGINALS})`);
  } finally {
    minioClient.destroy();
  }
};

run().catch((error: Error) => {
  console.error(`[worker:smoke:minio] ${error.message}`);
  process.exit(1);
});
