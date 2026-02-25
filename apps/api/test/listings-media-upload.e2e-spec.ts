import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { ListingsService } from '../src/listings/listings.service';

const userHeaders = {
  'x-auth-user-id': 'user-media-1',
  'x-auth-email': 'user-media-1@example.test',
  'x-auth-roles': 'user',
};

describe('Listings media endpoints', () => {
  let app: NestFastifyApplication;
  const uploadMediaForUser = vi.fn(async () => ({
    id: 'media-1',
    listingId: '1',
    storageKey: 'listings/1/media-1.png',
    mimeType: 'image/png',
    fileSize: '67',
    width: 1,
    height: 1,
    hash: null,
    position: 1,
    isPrimary: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    objectUrl: 'http://localhost:9000/listing-originals/listings/1/media-1.png',
  }));
  const listMediaForUser = vi.fn(async () => [
    {
      id: '1',
      listingId: '1',
      storageKey: 'listings/1/media-1.png',
      mimeType: 'image/png',
      fileSize: '67',
      width: 1,
      height: 1,
      hash: null,
      position: 1,
      isPrimary: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      objectUrl: 'http://localhost:9000/listing-originals/listings/1/media-1.png',
    },
    {
      id: '2',
      listingId: '1',
      storageKey: 'listings/1/media-2.png',
      mimeType: 'image/png',
      fileSize: '67',
      width: 1,
      height: 1,
      hash: null,
      position: 2,
      isPrimary: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      objectUrl: 'http://localhost:9000/listing-originals/listings/1/media-2.png',
    },
  ]);
  const deleteMediaForUser = vi.fn(async () => ({
    id: '2',
    listingId: '1',
    storageKey: 'listings/1/media-2.png',
    mimeType: 'image/png',
    fileSize: '67',
    width: 1,
    height: 1,
    hash: null,
    position: 2,
    isPrimary: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    objectUrl: 'http://localhost:9000/listing-originals/listings/1/media-2.png',
  }));
  const reorderMediaForUser = vi.fn(async () => [
    {
      id: '2',
      listingId: '1',
      storageKey: 'listings/1/media-2.png',
      mimeType: 'image/png',
      fileSize: '67',
      width: 1,
      height: 1,
      hash: null,
      position: 1,
      isPrimary: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      objectUrl: 'http://localhost:9000/listing-originals/listings/1/media-2.png',
    },
    {
      id: '1',
      listingId: '1',
      storageKey: 'listings/1/media-1.png',
      mimeType: 'image/png',
      fileSize: '67',
      width: 1,
      height: 1,
      hash: null,
      position: 2,
      isPrimary: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      objectUrl: 'http://localhost:9000/listing-originals/listings/1/media-1.png',
    },
  ]);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ListingsService)
      .useValue({
        uploadMediaForUser,
        listMediaForUser,
        deleteMediaForUser,
        reorderMediaForUser,
      })
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    uploadMediaForUser.mockClear();
    listMediaForUser.mockClear();
    deleteMediaForUser.mockClear();
    reorderMediaForUser.mockClear();
  });

  it('denies upload without authentication headers', async () => {
    const response = await request(app.getHttpServer()).post('/v1/listings/1/media').send({
      mimeType: 'image/png',
      contentBase64:
        'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AApMBgX4+7a8AAAAASUVORK5CYII=',
    });

    expect(response.status).toBe(401);
  });

  it('validates required upload payload fields', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/listings/1/media')
      .set(userHeaders)
      .send({
        mimeType: 'image/png',
      });

    expect(response.status).toBe(400);
  });

  it('uploads media with valid payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/listings/1/media')
      .set(userHeaders)
      .send({
        mimeType: 'image/png',
        contentBase64:
          'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8Xw8AApMBgX4+7a8AAAAASUVORK5CYII=',
        fileName: 'cat.png',
        isPrimary: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.media.storageKey).toBe('listings/1/media-1.png');
    expect(uploadMediaForUser).toHaveBeenCalledTimes(1);
    const firstCall = uploadMediaForUser.mock.calls[0] as unknown[] | undefined;
    expect(firstCall?.[1]).toBe('1');
  });

  it('lists listing media', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/listings/1/media')
      .set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.media).toHaveLength(2);
    expect(listMediaForUser).toHaveBeenCalledWith(expect.any(Object), '1');
  });

  it('deletes listing media by id', async () => {
    const response = await request(app.getHttpServer())
      .delete('/v1/listings/1/media/2')
      .set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.media.id).toBe('2');
    expect(deleteMediaForUser).toHaveBeenCalledWith(expect.any(Object), '1', '2');
  });

  it('validates reorder payload', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/listings/1/media/order')
      .set(userHeaders)
      .send({
        mediaIds: ['2', '2'],
      });

    expect(response.status).toBe(400);
    expect(reorderMediaForUser).not.toHaveBeenCalled();
  });

  it('reorders media with valid payload', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/listings/1/media/order')
      .set(userHeaders)
      .send({
        mediaIds: ['2', '1'],
      });

    expect(response.status).toBe(200);
    expect(response.body.media[0].id).toBe('2');
    expect(reorderMediaForUser).toHaveBeenCalledWith(expect.any(Object), '1', ['2', '1']);
  });
});
