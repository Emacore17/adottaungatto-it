import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { CatBreedsService } from '../src/listings/cat-breeds.service';

describe('Listings breeds endpoint', () => {
  let app: NestFastifyApplication;

  const listPublicBreeds = vi.fn(async () => [
    {
      id: '1',
      slug: 'europeo',
      label: 'Europeo',
      sortOrder: 1,
    },
    {
      id: '2',
      slug: 'maine-coon',
      label: 'Maine Coon',
      sortOrder: 2,
    },
  ]);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(CatBreedsService)
      .useValue({
        listPublicBreeds,
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
    listPublicBreeds.mockClear();
  });

  it('GET /v1/listings/breeds should be public and ordered', async () => {
    const response = await request(app.getHttpServer()).get('/v1/listings/breeds');

    expect(response.status).toBe(200);
    expect(response.body.breeds).toEqual([
      {
        id: '1',
        slug: 'europeo',
        label: 'Europeo',
        sortOrder: 1,
      },
      {
        id: '2',
        slug: 'maine-coon',
        label: 'Maine Coon',
        sortOrder: 2,
      },
    ]);
    expect(listPublicBreeds).toHaveBeenCalledTimes(1);
  });
});
