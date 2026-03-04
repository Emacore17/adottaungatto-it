import { createHash, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import {
  access,
  cp,
  mkdir,
  readFile,
  readdir,
  rm,
  stat,
  writeFile,
} from 'node:fs/promises';
import { dirname, join, relative, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { loadApiEnv } from '@adottaungatto/config';
import {
  CreateBucketCommand,
  DeleteBucketCommand,
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadBucketCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { config as loadDotEnv } from 'dotenv';
import { Client } from 'pg';
import { spawn } from 'node:child_process';

export type BackupManifest = {
  version: 1;
  createdAt: string;
  backupId: string;
  backupRoot: string;
  source: {
    postgresContainerName: string;
    databaseName: string;
    databaseUser: string;
    minioEndpoint: string;
    buckets: string[];
    searchRestoreStrategy: 'rebuild_from_database';
    searchRestoreCommand: string;
  };
  postgres: {
    dumpFile: string;
    rowCounts: Record<string, number>;
  };
  minio: {
    objects: Array<{
      bucket: string;
      key: string;
      size: number;
      sha256: string;
      file: string;
    }>;
  };
};

type VerifyBackupResult = {
  backupDir: string;
  verifiedDatabaseName: string;
  restoredBuckets: string[];
};

type DockerCommandOptions = {
  stdoutFilePath?: string;
};

type S3ObjectManifestEntry = BackupManifest['minio']['objects'][number];

const backupTables = [
  'schema_migrations',
  'regions',
  'provinces',
  'comuni',
  'app_users',
  'listings',
  'listing_media',
  'listing_contact_requests',
  'cat_breeds',
  'plans',
  'listing_promotions',
  'analytics_events',
  'admin_audit_logs',
  'message_threads',
  'message_messages',
  'notification_outbox',
] as const;

const manifestFileName = 'manifest.json';
const postgresDumpFileName = 'postgres.dump';
const backupRootDirectory = resolve(process.cwd(), 'backups', 'local');
const postgresContainerName =
  process.env.BACKUP_POSTGRES_CONTAINER_NAME?.trim() || 'adottaungatto-postgres';

const loadEnv = () => {
  loadDotEnv({ path: '.env.local' });
  loadDotEnv();
  return loadApiEnv();
};

const toTimestamp = (date: Date) =>
  date
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\..+$/, '')
    .replace('T', '_');

const toPosixPath = (value: string) => value.replace(/\\/g, '/');

const ensureDirectory = async (directoryPath: string): Promise<void> => {
  await mkdir(directoryPath, { recursive: true });
};

const fileExists = async (filePath: string): Promise<boolean> => {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
};

const createS3Client = (env: ReturnType<typeof loadApiEnv>) =>
  new S3Client({
    endpoint: env.MINIO_ENDPOINT,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: env.MINIO_ACCESS_KEY,
      secretAccessKey: env.MINIO_SECRET_KEY,
    },
  });

const getDatabaseConnectionInfo = (databaseUrl: string) => {
  const parsedUrl = new URL(databaseUrl);
  const databaseName = decodeURIComponent(parsedUrl.pathname.replace(/^\//, ''));
  const databaseUser = decodeURIComponent(parsedUrl.username);

  if (!databaseName) {
    throw new Error('DATABASE_URL does not include a database name.');
  }

  if (!databaseUser) {
    throw new Error('DATABASE_URL does not include a database user.');
  }

  return {
    databaseName,
    databaseUser,
  };
};

const collectReadableStream = async (stream: Readable): Promise<Buffer> => {
  const chunks: Buffer[] = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const bodyToBuffer = async (body: unknown): Promise<Buffer> => {
  if (body instanceof Readable) {
    return collectReadableStream(body);
  }

  if (typeof body === 'object' && body !== null) {
    const maybeTransformable = body as {
      transformToByteArray?: () => Promise<Uint8Array>;
    };

    if (typeof maybeTransformable.transformToByteArray === 'function') {
      return Buffer.from(await maybeTransformable.transformToByteArray());
    }
  }

  throw new Error('Unsupported S3 response body.');
};

const computeFileSha256 = async (filePath: string): Promise<string> => {
  const hash = createHash('sha256');
  const stream = createReadStream(filePath);
  for await (const chunk of stream) {
    hash.update(chunk);
  }
  return hash.digest('hex');
};

const runDockerCommand = async (
  args: string[],
  options: DockerCommandOptions = {},
): Promise<void> => {
  await new Promise<void>((resolvePromise, rejectPromise) => {
    const child = spawn('docker', args, {
      cwd: process.cwd(),
      stdio: ['ignore', options.stdoutFilePath ? 'pipe' : 'inherit', 'pipe'],
    });

    let stderr = '';
    if (child.stderr) {
      child.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });
    }

    if (options.stdoutFilePath && child.stdout) {
      const outputStream = createWriteStream(options.stdoutFilePath);
      child.stdout.pipe(outputStream);
      outputStream.on('error', rejectPromise);
    }

    child.on('error', rejectPromise);
    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise();
        return;
      }

      rejectPromise(
        new Error(`docker ${args.join(' ')} failed with exit code ${code ?? 'unknown'}: ${stderr.trim()}`),
      );
    });
  });
};

const listBucketObjects = async (
  s3: S3Client,
  bucketName: string,
): Promise<Array<{ key: string; size: number }>> => {
  const objects: Array<{ key: string; size: number }> = [];
  let continuationToken: string | undefined;

  while (true) {
    const response = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucketName,
        ContinuationToken: continuationToken,
      }),
    );

    for (const item of response.Contents ?? []) {
      if (!item.Key) {
        continue;
      }

      objects.push({
        key: item.Key,
        size: Number(item.Size ?? 0),
      });
    }

    if (!response.IsTruncated || !response.NextContinuationToken) {
      break;
    }

    continuationToken = response.NextContinuationToken;
  }

  return objects;
};

const queryRowCounts = async (databaseUrl: string): Promise<Record<string, number>> => {
  const client = new Client({
    connectionString: databaseUrl,
  });

  await client.connect();
  try {
    const rowCounts: Record<string, number> = {};
    for (const tableName of backupTables) {
      const result = await client.query<{ count: string }>(
        `SELECT COUNT(*)::text AS "count" FROM ${tableName};`,
      );
      rowCounts[tableName] = Number.parseInt(result.rows[0]?.count ?? '0', 10) || 0;
    }

    return rowCounts;
  } finally {
    await client.end();
  }
};

const downloadBucketObject = async (
  s3: S3Client,
  backupDir: string,
  bucketName: string,
  objectKey: string,
): Promise<S3ObjectManifestEntry> => {
  const targetFilePath = resolve(backupDir, 'minio', bucketName, ...objectKey.split('/'));
  await ensureDirectory(dirname(targetFilePath));

  const response = await s3.send(
    new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
    }),
  );

  const body = await bodyToBuffer(response.Body);
  await writeFile(targetFilePath, body);
  const fileStats = await stat(targetFilePath);

  return {
    bucket: bucketName,
    key: objectKey,
    size: fileStats.size,
    sha256: await computeFileSha256(targetFilePath),
    file: toPosixPath(relative(backupDir, targetFilePath)),
  };
};

const exportMinioObjects = async (
  s3: S3Client,
  backupDir: string,
  bucketNames: string[],
): Promise<S3ObjectManifestEntry[]> => {
  const manifestEntries: S3ObjectManifestEntry[] = [];
  for (const bucketName of bucketNames) {
    const objects = await listBucketObjects(s3, bucketName);
    for (const object of objects) {
      manifestEntries.push(await downloadBucketObject(s3, backupDir, bucketName, object.key));
    }
  }

  manifestEntries.sort((left, right) =>
    `${left.bucket}/${left.key}`.localeCompare(`${right.bucket}/${right.key}`),
  );
  return manifestEntries;
};

const createBackupManifest = (input: {
  backupDir: string;
  createdAt: string;
  postgresDumpFile: string;
  rowCounts: Record<string, number>;
  minioObjects: S3ObjectManifestEntry[];
  databaseName: string;
  databaseUser: string;
  minioEndpoint: string;
  buckets: string[];
}): BackupManifest => ({
  version: 1,
  createdAt: input.createdAt,
  backupId: randomUUID(),
  backupRoot: toPosixPath(relative(process.cwd(), input.backupDir)),
  source: {
    postgresContainerName,
    databaseName: input.databaseName,
    databaseUser: input.databaseUser,
    minioEndpoint: input.minioEndpoint,
    buckets: input.buckets,
    searchRestoreStrategy: 'rebuild_from_database',
    searchRestoreCommand: 'pnpm search:reindex',
  },
  postgres: {
    dumpFile: input.postgresDumpFile,
    rowCounts: input.rowCounts,
  },
  minio: {
    objects: input.minioObjects,
  },
});

export const createLocalBackup = async (requestedDirectory?: string): Promise<string> => {
  const env = loadEnv();
  const { databaseName, databaseUser } = getDatabaseConnectionInfo(env.DATABASE_URL);
  const timestamp = toTimestamp(new Date());
  const backupDir = requestedDirectory
    ? resolve(process.cwd(), requestedDirectory)
    : resolve(backupRootDirectory, timestamp);
  const postgresDumpPath = resolve(backupDir, postgresDumpFileName);
  const manifestPath = resolve(backupDir, manifestFileName);
  const bucketNames = [env.MINIO_BUCKET_LISTING_ORIGINALS, env.MINIO_BUCKET_LISTING_THUMBS];

  await ensureDirectory(backupDir);

  await runDockerCommand(
    [
      'exec',
      '-i',
      postgresContainerName,
      'pg_dump',
      '-U',
      databaseUser,
      '-d',
      databaseName,
      '--format=custom',
      '--no-owner',
      '--no-privileges',
    ],
    {
      stdoutFilePath: postgresDumpPath,
    },
  );

  const rowCounts = await queryRowCounts(env.DATABASE_URL);
  const s3 = createS3Client(env);
  const minioObjects = await exportMinioObjects(s3, backupDir, bucketNames);
  const manifest = createBackupManifest({
    backupDir,
    createdAt: new Date().toISOString(),
    postgresDumpFile: postgresDumpFileName,
    rowCounts,
    minioObjects,
    databaseName,
    databaseUser,
    minioEndpoint: env.MINIO_ENDPOINT,
    buckets: bucketNames,
  });

  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  s3.destroy();

  return backupDir;
};

const loadBackupManifest = async (backupDir: string): Promise<BackupManifest> => {
  const manifestPath = resolve(backupDir, manifestFileName);
  const manifestContent = await readFile(manifestPath, 'utf8');
  return JSON.parse(manifestContent) as BackupManifest;
};

export const resolveLatestBackupDirectory = async (): Promise<string> => {
  const entries = await readdir(backupRootDirectory, { withFileTypes: true });
  const candidateDirectories = entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort((left, right) => right.localeCompare(left));

  const latestDirectory = candidateDirectories[0];
  if (!latestDirectory) {
    throw new Error('No local backups found in backups/local.');
  }

  return resolve(backupRootDirectory, latestDirectory);
};

const cloneDatabaseUrlWithDatabaseName = (databaseUrl: string, databaseName: string): string => {
  const parsedUrl = new URL(databaseUrl);
  parsedUrl.pathname = `/${databaseName}`;
  return parsedUrl.toString();
};

const copyBackupDumpIntoContainer = async (localDumpPath: string, remoteDumpPath: string) => {
  await runDockerCommand(['cp', localDumpPath, `${postgresContainerName}:${remoteDumpPath}`]);
};

const cleanupContainerDump = async (remoteDumpPath: string) => {
  try {
    await runDockerCommand(['exec', postgresContainerName, 'rm', '-f', remoteDumpPath]);
  } catch {
    // Best effort cleanup.
  }
};

const createTemporaryDatabase = async (databaseUser: string, databaseName: string) => {
  await runDockerCommand(['exec', postgresContainerName, 'createdb', '-U', databaseUser, databaseName]);
};

const dropTemporaryDatabase = async (databaseUser: string, databaseName: string) => {
  try {
    await runDockerCommand([
      'exec',
      postgresContainerName,
      'dropdb',
      '--if-exists',
      '-U',
      databaseUser,
      databaseName,
    ]);
  } catch {
    // Best effort cleanup.
  }
};

const restorePostgresDump = async (
  remoteDumpPath: string,
  databaseUser: string,
  targetDatabaseName: string,
) => {
  await runDockerCommand([
    'exec',
    postgresContainerName,
    'pg_restore',
    '-U',
    databaseUser,
    '-d',
    targetDatabaseName,
    '--clean',
    '--if-exists',
    remoteDumpPath,
  ]);
};

const ensureBucketExists = async (s3: S3Client, bucketName: string): Promise<void> => {
  try {
    await s3.send(
      new HeadBucketCommand({
        Bucket: bucketName,
      }),
    );
  } catch (error) {
    const maybeError = error as { name?: string; Code?: string; $metadata?: { httpStatusCode?: number } };
    const isMissing =
      maybeError.name === 'NotFound' ||
      maybeError.Code === 'NoSuchBucket' ||
      maybeError.$metadata?.httpStatusCode === 404;

    if (!isMissing) {
      throw error;
    }

    await s3.send(
      new CreateBucketCommand({
        Bucket: bucketName,
      }),
    );
  }
};

const deleteBucketRecursively = async (s3: S3Client, bucketName: string): Promise<void> => {
  try {
    while (true) {
      const response = await s3.send(
        new ListObjectsV2Command({
          Bucket: bucketName,
        }),
      );

      const objects = (response.Contents ?? [])
        .map((item) => item.Key)
        .filter((key): key is string => typeof key === 'string' && key.length > 0);

      if (objects.length === 0) {
        break;
      }

      await s3.send(
        new DeleteObjectsCommand({
          Bucket: bucketName,
          Delete: {
            Objects: objects.map((key) => ({ Key: key })),
            Quiet: true,
          },
        }),
      );

      if (!response.IsTruncated) {
        break;
      }
    }

    await s3.send(
      new DeleteBucketCommand({
        Bucket: bucketName,
      }),
    );
  } catch {
    // Best effort cleanup.
  }
};

const verifyMinioFiles = async (backupDir: string, manifest: BackupManifest): Promise<void> => {
  for (const object of manifest.minio.objects) {
    const absoluteFilePath = resolve(backupDir, object.file);
    if (!(await fileExists(absoluteFilePath))) {
      throw new Error(`Missing MinIO backup file: ${object.file}`);
    }

    const fileStats = await stat(absoluteFilePath);
    if (fileStats.size !== object.size) {
      throw new Error(
        `Unexpected file size for ${object.file}. Expected ${object.size}, received ${fileStats.size}.`,
      );
    }

    const actualSha256 = await computeFileSha256(absoluteFilePath);
    if (actualSha256 !== object.sha256) {
      throw new Error(`Checksum mismatch for ${object.file}.`);
    }
  }
};

const restoreMinioBackupIntoTemporaryBuckets = async (
  s3: S3Client,
  backupDir: string,
  manifest: BackupManifest,
): Promise<string[]> => {
  const suffix = `restore-verify-${Date.now().toString(36)}`;
  const targetBuckets = Array.from(new Set(manifest.source.buckets)).map(
    (bucketName) => `${bucketName}-${suffix}`,
  );
  const bucketMap = new Map(manifest.source.buckets.map((bucketName, index) => [bucketName, targetBuckets[index]!]));

  for (const bucketName of targetBuckets) {
    await ensureBucketExists(s3, bucketName);
  }

  try {
    for (const object of manifest.minio.objects) {
      const targetBucket = bucketMap.get(object.bucket);
      if (!targetBucket) {
        throw new Error(`Missing target bucket for ${object.bucket}.`);
      }

      const filePath = resolve(backupDir, object.file);
      await s3.send(
        new PutObjectCommand({
          Bucket: targetBucket,
          Key: object.key,
          Body: createReadStream(filePath),
        }),
      );
    }

    for (const [sourceBucket, targetBucket] of bucketMap.entries()) {
      const sourceCount = manifest.minio.objects.filter((item) => item.bucket === sourceBucket).length;
      const restoredObjects = await listBucketObjects(s3, targetBucket);
      if (restoredObjects.length !== sourceCount) {
        throw new Error(
          `Unexpected restored object count for ${targetBucket}. Expected ${sourceCount}, received ${restoredObjects.length}.`,
        );
      }
    }

    return targetBuckets;
  } catch (error) {
    for (const bucketName of targetBuckets) {
      await deleteBucketRecursively(s3, bucketName);
    }
    throw error;
  }
};

export const verifyLocalBackup = async (requestedDirectory?: string): Promise<VerifyBackupResult> => {
  const env = loadEnv();
  const backupDir = requestedDirectory
    ? resolve(process.cwd(), requestedDirectory)
    : await resolveLatestBackupDirectory();
  const manifest = await loadBackupManifest(backupDir);
  const postgresDumpPath = resolve(backupDir, manifest.postgres.dumpFile);
  const { databaseUser } = getDatabaseConnectionInfo(env.DATABASE_URL);
  const remoteDumpPath = `/tmp/${manifest.backupId}.dump`;
  const targetDatabaseName = `restore_verify_${Date.now().toString(36)}`;

  if (!(await fileExists(postgresDumpPath))) {
    throw new Error(`Missing Postgres dump file: ${manifest.postgres.dumpFile}`);
  }

  await verifyMinioFiles(backupDir, manifest);

  await dropTemporaryDatabase(databaseUser, targetDatabaseName);
  await createTemporaryDatabase(databaseUser, targetDatabaseName);

  try {
    await copyBackupDumpIntoContainer(postgresDumpPath, remoteDumpPath);
    await restorePostgresDump(remoteDumpPath, databaseUser, targetDatabaseName);

    const restoredCounts = await queryRowCounts(
      cloneDatabaseUrlWithDatabaseName(env.DATABASE_URL, targetDatabaseName),
    );

    for (const [tableName, expectedCount] of Object.entries(manifest.postgres.rowCounts)) {
      const restoredCount = restoredCounts[tableName] ?? 0;
      if (restoredCount !== expectedCount) {
        throw new Error(
          `Unexpected row count for ${tableName} in restored database. Expected ${expectedCount}, received ${restoredCount}.`,
        );
      }
    }

    const s3 = createS3Client(env);
    const restoredBuckets = await restoreMinioBackupIntoTemporaryBuckets(s3, backupDir, manifest);
    for (const bucketName of restoredBuckets) {
      await deleteBucketRecursively(s3, bucketName);
    }
    s3.destroy();

    return {
      backupDir,
      verifiedDatabaseName: targetDatabaseName,
      restoredBuckets,
    };
  } finally {
    await cleanupContainerDump(remoteDumpPath);
    await dropTemporaryDatabase(databaseUser, targetDatabaseName);
  }
};

export const runBackupSmoke = async (): Promise<string> => {
  const backupDir = await createLocalBackup();
  await verifyLocalBackup(backupDir);
  return backupDir;
};
