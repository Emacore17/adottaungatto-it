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

type UploadUserAvatarInput = {
  userStorageId: string;
  mimeType: string;
  payload: Buffer;
  originalFileName: string | null;
};

type UploadUserAvatarResult = {
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
  private readonly listingBucketName = this.env.MINIO_BUCKET_LISTING_ORIGINALS;
  private readonly thumbsBucketName = this.env.MINIO_BUCKET_LISTING_THUMBS;
  private readonly userAvatarBucketName = this.env.MINIO_BUCKET_USER_AVATARS;
  private readonly mediaUploadMaxBytes = this.env.MEDIA_UPLOAD_MAX_BYTES;
  private readonly mediaAllowedMimeTypes = new Set(this.env.MEDIA_ALLOWED_MIME_TYPES);
  private readonly avatarUploadMaxBytes = this.env.AVATAR_UPLOAD_MAX_BYTES;
  private readonly avatarAllowedMimeTypes = new Set(this.env.AVATAR_ALLOWED_MIME_TYPES);
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
    return this.uploadImageObject({
      bucketName: this.listingBucketName,
      keyPrefix: `listings/${input.listingId}`,
      mimeType: input.mimeType,
      payload: input.payload,
      originalFileName: input.originalFileName,
      maxUploadBytes: this.mediaUploadMaxBytes,
      allowedMimeTypes: this.mediaAllowedMimeTypes,
    });
  }

  async uploadUserAvatar(input: UploadUserAvatarInput): Promise<UploadUserAvatarResult> {
    return this.uploadImageObject({
      bucketName: this.userAvatarBucketName,
      keyPrefix: `avatars/${input.userStorageId}`,
      mimeType: input.mimeType,
      payload: input.payload,
      originalFileName: input.originalFileName,
      maxUploadBytes: this.avatarUploadMaxBytes,
      allowedMimeTypes: this.avatarAllowedMimeTypes,
    });
  }

  async ensureRequiredBuckets(): Promise<void> {
    await this.ensureBucketExists(this.listingBucketName);
    await this.ensureBucketExists(this.thumbsBucketName);
    await this.ensureBucketExists(this.userAvatarBucketName);
  }

  async objectExists(storageKey: string): Promise<boolean> {
    try {
      await this.s3.send(
        new HeadObjectCommand({
          Bucket: this.listingBucketName,
          Key: storageKey,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async deleteMediaObject(storageKey: string): Promise<void> {
    await this.deleteObjectInBucket(this.listingBucketName, storageKey);
  }

  async deleteUserAvatarObject(storageKey: string): Promise<void> {
    await this.deleteObjectInBucket(this.userAvatarBucketName, storageKey);
  }

  getUserAvatarObjectUrl(storageKey: string): string {
    return this.buildObjectUrl(this.userAvatarBucketName, storageKey);
  }

  getListingMediaObjectUrl(storageKey: string): string {
    return this.buildObjectUrl(this.listingBucketName, storageKey);
  }

  private async deleteObjectInBucket(bucketName: string, storageKey: string): Promise<void> {
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: bucketName,
          Key: storageKey,
        }),
      );
    } catch {
      // Best effort cleanup to avoid masking the original error path.
    }
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

  private validateMimeType(mimeType: string, allowedMimeTypes: Set<string>): void {
    const normalized = mimeType.trim().toLowerCase();
    if (!allowedMimeTypes.has(normalized)) {
      throw new BadRequestException(
        `Unsupported mime type "${mimeType}". Allowed: ${Array.from(allowedMimeTypes).join(', ')}.`,
      );
    }
  }

  private validateFileSize(fileSize: number, maxUploadBytes: number): void {
    if (fileSize <= 0) {
      throw new BadRequestException('Uploaded media payload is empty.');
    }

    if (fileSize > maxUploadBytes) {
      throw new BadRequestException(
        `Uploaded media exceeds max size (${maxUploadBytes} bytes).`,
      );
    }
  }

  private buildStorageKey(
    keyPrefix: string,
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

    return `${keyPrefix}/${Date.now()}-${slugPart}-${randomUUID()}.${extension}`;
  }

  private buildObjectUrl(bucketName: string, storageKey: string): string {
    return `${this.endpointUrl.origin}/${bucketName}/${storageKey}`;
  }

  private async uploadImageObject(input: {
    bucketName: string;
    keyPrefix: string;
    mimeType: string;
    payload: Buffer;
    originalFileName: string | null;
    maxUploadBytes: number;
    allowedMimeTypes: Set<string>;
  }): Promise<{
    bucket: string;
    storageKey: string;
    fileSize: number;
    mimeType: string;
    objectUrl: string;
  }> {
    this.validateMimeType(input.mimeType, input.allowedMimeTypes);
    this.validateFileSize(input.payload.length, input.maxUploadBytes);
    await this.ensureBucketExists(input.bucketName);

    const storageKey = this.buildStorageKey(input.keyPrefix, input.mimeType, input.originalFileName);

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: input.bucketName,
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
      bucket: input.bucketName,
      storageKey,
      fileSize: input.payload.length,
      mimeType: input.mimeType,
      objectUrl: this.buildObjectUrl(input.bucketName, storageKey),
    };
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
