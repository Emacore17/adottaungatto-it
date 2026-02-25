import type { WorkerEnv } from '@adottaungatto/config';
import { HeadBucketCommand, S3Client } from '@aws-sdk/client-s3';

export const createWorkerMinioClient = (env: WorkerEnv): S3Client =>
  new S3Client({
    endpoint: env.MINIO_ENDPOINT,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY,
    },
  });

export const pingWorkerMinioBucket = async (
  client: S3Client,
  bucketName: string,
): Promise<void> => {
  await client.send(
    new HeadBucketCommand({
      Bucket: bucketName,
    }),
  );
};
