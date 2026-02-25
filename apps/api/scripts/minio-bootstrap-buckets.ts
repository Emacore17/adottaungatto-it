import { config as loadDotEnv } from 'dotenv';
import { MinioStorageService } from '../src/listings/minio-storage.service';

const run = async () => {
  loadDotEnv({ path: '.env.local' });
  loadDotEnv();

  const storageService = new MinioStorageService();
  await storageService.ensureRequiredBuckets();

  console.log('[minio:bootstrap] Buckets ensured: listing-originals, listing-thumbs');
};

run().catch((error: Error) => {
  console.error(`[minio:bootstrap] ${error.message}`);
  process.exit(1);
});
