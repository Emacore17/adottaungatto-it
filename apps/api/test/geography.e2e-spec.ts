import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { GeographyService } from '../src/geography/geography.service';

describe('Geography endpoints', () => {
  let app: NestFastifyApplication;
  const findRegions = vi.fn(async () => [
    { id: '1', istatCode: '01', name: 'Piemonte' },
    { id: '2', istatCode: '02', name: "Valle d'Aosta/Vallée d'Aoste" },
  ]);

  const findProvincesByRegionId = vi.fn(async (regionId: string) => [
    { id: '11', regionId, istatCode: '001', name: 'Torino', sigla: 'TO' },
  ]);

  const findComuniByProvinceId = vi.fn(async (provinceId: string) => [
    {
      id: '101',
      regionId: '1',
      provinceId,
      istatCode: '001272',
      name: 'Torino',
      codeCatastale: 'L219',
    },
  ]);

  const search = vi.fn(async (query: string, limit: number) => [
    {
      type: 'comune',
      id: '101',
      name: `Torino (${query})`,
      label: 'Torino (TO)',
      secondaryLabel: 'Comune - Torino, Piemonte',
      istatCode: '001272',
      regionId: '1',
      provinceId: '11',
      comuneId: '101',
      regionName: 'Piemonte',
      provinceName: 'Torino',
      sigla: 'TO',
      locationIntent: {
        scope: 'comune',
        regionId: '1',
        provinceId: '11',
        comuneId: '101',
        label: 'Torino (TO)',
        secondaryLabel: 'Comune - Torino, Piemonte',
      },
    },
    {
      type: 'comune_plus_province',
      id: '101',
      name: `Torino (${query})`,
      label: 'Torino e provincia (TO)',
      secondaryLabel: 'Provincia - Torino, Piemonte',
      istatCode: '001272',
      regionId: '1',
      provinceId: '11',
      comuneId: '101',
      regionName: 'Piemonte',
      provinceName: 'Torino',
      sigla: 'TO',
      locationIntent: {
        scope: 'comune_plus_province',
        regionId: '1',
        provinceId: '11',
        comuneId: '101',
        label: 'Torino e provincia (TO)',
        secondaryLabel: 'Provincia - Torino, Piemonte',
      },
    },
  ]);

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(GeographyService)
      .useValue({
        findRegions,
        findProvincesByRegionId,
        findComuniByProvinceId,
        search,
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
    findRegions.mockClear();
    findProvincesByRegionId.mockClear();
    findComuniByProvinceId.mockClear();
    search.mockClear();
  });

  it('GET /v1/geography/regions should be public and return regions', async () => {
    const response = await request(app.getHttpServer()).get('/v1/geography/regions');
    expect(response.status).toBe(200);
    expect(response.body.regions).toHaveLength(2);
    expect(findRegions).toHaveBeenCalledTimes(1);
  });

  it('GET /v1/geography/provinces should validate regionId', async () => {
    const response = await request(app.getHttpServer()).get('/v1/geography/provinces');
    expect(response.status).toBe(400);
  });

  it('GET /v1/geography/provinces should return provinces by regionId', async () => {
    const response = await request(app.getHttpServer()).get('/v1/geography/provinces?regionId=1');
    expect(response.status).toBe(200);
    expect(response.body.provinces[0].name).toBe('Torino');
    expect(findProvincesByRegionId).toHaveBeenCalledWith('1');
  });

  it('GET /v1/geography/comuni should validate provinceId', async () => {
    const response = await request(app.getHttpServer()).get('/v1/geography/comuni?provinceId=abc');
    expect(response.status).toBe(400);
  });

  it('GET /v1/geography/comuni should return comuni by provinceId', async () => {
    const response = await request(app.getHttpServer()).get('/v1/geography/comuni?provinceId=11');
    expect(response.status).toBe(200);
    expect(response.body.comuni[0].name).toBe('Torino');
    expect(findComuniByProvinceId).toHaveBeenCalledWith('11');
  });

  it('GET /v1/geography/search should validate q and limit', async () => {
    const missingQuery = await request(app.getHttpServer()).get('/v1/geography/search');
    expect(missingQuery.status).toBe(400);

    const invalidLimit = await request(app.getHttpServer()).get(
      '/v1/geography/search?q=to&limit=0',
    );
    expect(invalidLimit.status).toBe(400);
  });

  it('GET /v1/geography/search should return autocomplete items', async () => {
    const response = await request(app.getHttpServer()).get('/v1/geography/search?q=Tor&limit=5');
    expect(response.status).toBe(200);
    expect(response.body.query).toBe('Tor');
    expect(response.body.items[0].type).toBe('comune');
    expect(response.body.items[0].locationIntent.scope).toBe('comune');
    expect(response.body.items[1].type).toBe('comune_plus_province');
    expect(search).toHaveBeenCalledWith('Tor', 5);
  });
});
