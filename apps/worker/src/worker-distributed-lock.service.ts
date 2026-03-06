import { Inject, Injectable } from '@nestjs/common';
import { Pool } from 'pg';
import { WORKER_DATABASE_POOL } from './database/database.constants';

const advisoryLockNamespace = 61_027;

export type DistributedLockExecutionResult<T> = {
  acquired: boolean;
  result?: T;
};

@Injectable()
export class WorkerDistributedLockService {
  constructor(
    @Inject(WORKER_DATABASE_POOL)
    private readonly pool: Pool,
  ) {}

  async runWithLock<T>(
    lockName: string,
    task: () => Promise<T>,
  ): Promise<DistributedLockExecutionResult<T>> {
    const client = await this.pool.connect();
    let lockAcquired = false;

    try {
      const lockResult = await client.query<{ acquired: boolean }>(
        `
          SELECT pg_try_advisory_lock($1::integer, hashtext($2)) AS "acquired";
        `,
        [advisoryLockNamespace, lockName],
      );
      lockAcquired = lockResult.rows[0]?.acquired === true;

      if (!lockAcquired) {
        return {
          acquired: false,
        };
      }

      const result = await task();
      return {
        acquired: true,
        result,
      };
    } finally {
      if (lockAcquired) {
        try {
          await client.query(
            `
              SELECT pg_advisory_unlock($1::integer, hashtext($2));
            `,
            [advisoryLockNamespace, lockName],
          );
        } catch {
          // Best effort unlock; Postgres also releases advisory locks on session close.
        }
      }

      client.release();
    }
  }
}
