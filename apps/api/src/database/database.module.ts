import { loadApiEnv } from '@adottaungatto/config';
import { Global, Injectable, Module, type OnModuleDestroy } from '@nestjs/common';
import { Pool } from 'pg';
import { API_DATABASE_POOL } from './database.constants';

@Injectable()
class ApiDatabasePoolProvider implements OnModuleDestroy {
  readonly pool: Pool;

  constructor() {
    const env = loadApiEnv();
    this.pool = new Pool({
      connectionString: env.DATABASE_URL,
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}

@Global()
@Module({
  providers: [
    ApiDatabasePoolProvider,
    {
      provide: API_DATABASE_POOL,
      useFactory: (provider: ApiDatabasePoolProvider) => provider.pool,
      inject: [ApiDatabasePoolProvider],
    },
  ],
  exports: [API_DATABASE_POOL],
})
export class DatabaseModule {}
