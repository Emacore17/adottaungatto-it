import { loadWorkerEnv } from '@adottaungatto/config';
import { Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { WORKER_DATABASE_POOL } from './database.constants';

@Injectable()
class WorkerDatabasePoolProvider implements OnModuleDestroy {
  readonly pool: Pool;

  constructor() {
    const env = loadWorkerEnv();
    this.pool = new Pool({
      connectionString: env.DATABASE_URL,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

@Module({
  providers: [
    WorkerDatabasePoolProvider,
    {
      provide: WORKER_DATABASE_POOL,
      useFactory: (provider: WorkerDatabasePoolProvider) => provider.pool,
      inject: [WorkerDatabasePoolProvider],
    },
  ],
  exports: [WORKER_DATABASE_POOL],
})
export class DatabaseModule {}
