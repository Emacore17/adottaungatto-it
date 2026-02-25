import { randomUUID } from 'node:crypto';
import { loadApiEnv } from '@adottaungatto/config';
import {
  CreateBucketCommand,
  DeleteObjectCommand,
  HeadBucketCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';

type UploadListingMediaInput = {
  listingId: string;
  mimeType: string;
  payload: Buffer;
  originalFileName: string | null;
};

type UploadListingMediaResult = {
  bucket: string;
  storageKey: string;
  fileSize: number;
  mimeType: string;
  objectUrl: string;
};

const extensionByMimeType: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

@Injectable()
export class MinioStorageService {
  private readonly env = loadApiEnv();
  private readonly bucketName = this.env.MINIO_BUCKET_LISTING_ORIGINALS;
  private readonly thumbsBucketName = this.env.MINIO_BUCKET_LISTING_THUMBS;
  private readonly maxUploadBytes = this.env.MEDIA_UPLOAD_MAX_BYTES;
  private readonly allowedMimeTypes = new Set(this.env.MEDIA_ALLOWED_MIME_TYPES);
  private readonly endpointUrl = new URL(this.env.MINIO_ENDPOINT);

  private readonly s3 = new S3Client({
    endpoint: this.env.MINIO_ENDPOINT,
    region: 'us-east-1',
    forcePathStyle: true,
    credentials: {
      accessKeyId: this.env.MINIO_ACCESS_KEY,
      secretAccessKey: this.env.MINIO_SECRET_KEY,
    },
  });

  private readonly ensuredBuckets = new Set<string>();

  async uploadListingMedia(input: UploadListingMediaInput): Promise<UploadListingMediaResult> {
    this.validateMimeType(input.mimeType);
    this.validateFileSize(input.payload.length);
    await this.ensureBucketExists(this.bucketName);

    const storageKey = this.buildStorageKey(
      input.listingId,
      input.mimeType,
      input.originalFileName,
    );

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
          Body: input.payload,
          ContentType: input.mimeType,
        }),
      );
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to upload media to MinIO: ${(error as Error).message}`,
      );
    }

    return {
      bucket: this.bucketName,
      storageKey,
      fileSize: input.payload.length,
      mimeType: input.mimeType,
      objectUrl: this.buildObjectUrl(storageKey),
    };
  }

  async ensureRequiredBuckets(): Promise<void> {
    await this.ensureBucketExists(this.bucketName);
    await this.ensureBucketExists(this.thumbsBucketName);
  }

  async objectExists(storageKey: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async deleteMediaObject(storageKey: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucketName,
          Key: storageKey,
        }),
      );
    } catch {
      // Best effort cleanup to avoid masking the original error path.
    }
  }

  getListingMediaObjectUrl(storageKey: string): string {
    return this.buildObjectUrl(storageKey);
  }

  private async ensureBucketExists(bucketName: string): Promise<void> {
    if (this.ensuredBuckets.has(bucketName)) {
      return;
    }

    try {
      await this.s3.send(
        new HeadBucketCommand({
          Bucket: bucketName,
        }),
      );
    } catch (error) {
      if (!this.isBucketMissingError(error)) {
        throw new InternalServerErrorException(
          `MinIO bucket check failed (${bucketName}): ${(error as Error).message}`,
        );
      }

      await this.s3.send(
        new CreateBucketCommand({
          Bucket: bucketName,
        }),
      );
    }

    this.ensuredBuckets.add(bucketName);
  }

  private validateMimeType(mimeType: string): void {
    const normalized = mimeType.trim().toLowerCase();
    if (!this.allowedMimeTypes.has(normalized)) {
      throw new BadRequestException(
        `Unsupported mime type "${mimeType}". Allowed: ${Array.from(this.allowedMimeTypes).join(', ')}.`,
      );
    }
  }

  private validateFileSize(fileSize: number): void {
    if (fileSize <= 0) {
      throw new BadRequestException('Uploaded media payload is empty.');
    }

    if (fileSize > this.maxUploadBytes) {
      throw new BadRequestException(
        `Uploaded media exceeds max size (${this.maxUploadBytes} bytes).`,
      );
    }
  }

  private buildStorageKey(
    listingId: string,
    mimeType: string,
    originalFileName: string | null,
  ): string {
    const extension = extensionByMimeType[mimeType] ?? 'bin';
    const slugPart =
      originalFileName
        ?.trim()
        .toLowerCase()
        .replace(/[^a-z0-9.\-_]/g, '-')
        .replace(/-+/g, '-')
        .replace(/^-|-$/g, '')
        .slice(0, 48) ?? 'upload';

    return `listings/${listingId}/${Date.now()}-${slugPart}-${randomUUID()}.${extension}`;
  }

  private buildObjectUrl(storageKey: string): string {
    return `${this.endpointUrl.origin}/${this.bucketName}/${storageKey}`;
  }

  private isBucketMissingError(error: unknown): boolean {
    if (typeof error !== 'object' || error === null) {
      return false;
    }

    const maybeError = error as {
      name?: string;
      Code?: string;
      $metadata?: {
        httpStatusCode?: number;
      };
    };

    return (
      maybeError.name === 'NotFound' ||
      maybeError.Code === 'NoSuchBucket' ||
      maybeError.$metadata?.httpStatusCode === 404
    );
  }
}
