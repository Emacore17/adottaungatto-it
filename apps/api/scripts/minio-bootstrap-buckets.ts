import { config as loadDotEnv } from 'dotenv';
import { loadApiEnv } from '@adottaungatto/config';
import { MinioStorageService } from '../src/listings/minio-storage.service';

const run = async () => {
  loadDotEnv({ path: '.env.local' });
  loadDotEnv();
  const env = loadApiEnv();

  const storageService = new MinioStorageService();
  await storageService.ensureRequiredBuckets();

  console.log(
    `[minio:bootstrap] Buckets ensured: ${env.MINIO_BUCKET_LISTING_ORIGINALS}, ${env.MINIO_BUCKET_LISTING_THUMBS}, ${env.MINIO_BUCKET_USER_AVATARS}`,
  );
};

run().catch((error: Error) => {
  console.error(`[minio:bootstrap] ${error.message}`);
  process.exit(1);
});
