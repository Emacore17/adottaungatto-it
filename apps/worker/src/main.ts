import 'reflect-metadata';
import { loadWorkerEnv } from '@adottaungatto/config';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { config as loadDotEnv } from 'dotenv';
import Redis from 'ioredis';
import { createWorkerMinioClient, pingWorkerMinioBucket } from './minio-client';
import { WorkerModule } from './worker.module';

const bootstrap = async () => {
  loadDotEnv({ path: '.env.local' });
  loadDotEnv();

  const env = loadWorkerEnv();
  const logger = new Logger('WorkerBootstrap');

  const app = await NestFactory.createApplicationContext(WorkerModule, {
    bufferLogs: true,
  });

  const redis = new Redis(env.REDIS_URL, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
  });

  try {
    await redis.connect();
    logger.log(`Worker "${env.WORKER_NAME}" connected to Redis`);
  } catch (error) {
    logger.warn(`Worker started without Redis connection (${(error as Error).message}).`);
  } finally {
    await redis.disconnect();
  }

  const minioClient = createWorkerMinioClient(env);
  try {
    await pingWorkerMinioBucket(minioClient, env.MINIO_BUCKET_LISTING_ORIGINALS);
    logger.log(
      `Worker "${env.WORKER_NAME}" connected to MinIO bucket ${env.MINIO_BUCKET_LISTING_ORIGINALS}`,
    );
  } catch (error) {
    logger.warn(`Worker started without MinIO bucket check (${(error as Error).message}).`);
  } finally {
    minioClient.destroy();
  }

  logger.log(`Worker "${env.WORKER_NAME}" is up`);

  const keepAlive = setInterval(() => {
    logger.debug(`Worker "${env.WORKER_NAME}" heartbeat`);
  }, 60_000);

  const gracefulShutdown = async () => {
    clearInterval(keepAlive);
    await app.close();
    process.exit(0);
  };

  process.on('SIGINT', () => {
    void gracefulShutdown();
  });

  process.on('SIGTERM', () => {
    void gracefulShutdown();
  });
};

bootstrap().catch((error: Error) => {
  const logger = new Logger('WorkerBootstrap');
  logger.error(error.message);
  process.exit(1);
});
