import 'reflect-metadata';
import { loadApiEnv } from '@adottaungatto/config';
import cors from '@fastify/cors';
import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { config as loadDotEnv } from 'dotenv';
import { AppModule } from './app.module';

const bootstrap = async () => {
  loadDotEnv({ path: '.env.local' });
  loadDotEnv();
  const env = loadApiEnv();

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  await app.register(cors, {
    origin: true,
    credentials: true,
  });

  await app.listen(env.API_PORT, env.API_HOST);

  const logger = new Logger('Bootstrap');
  logger.log(`API ready on http://${env.API_HOST}:${env.API_PORT}`);
};

bootstrap().catch((error: Error) => {
  const logger = new Logger('Bootstrap');
  logger.error(error.message);
  process.exit(1);
});
