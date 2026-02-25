import { HttpException, HttpStatus } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { vi } from 'vitest';
import { AppModule } from '../src/app.module';
import { ListingsService } from '../src/listings/listings.service';

describe('Listings contact endpoint', () => {
  let app: NestFastifyApplication;

  const submitPublicContactRequest = vi.fn(
    async (
      listingId: string,
      _payload: {
        senderName: string;
        senderEmail: string;
        senderPhone: string | null;
        message: string;
        source: string;
      },
      _context: {
        senderIp: string | null;
        userAgent: string | null;
      },
    ): Promise<{
      requestId: string;
      listingId: string;
      createdAt: string;
      confirmationMessage: string;
    } | null> => ({
      requestId: 'contact-5001',
      listingId,
      createdAt: new Date().toISOString(),
      confirmationMessage:
        "Richiesta inviata con successo. L'inserzionista ti contattera tramite i recapiti indicati.",
    }),
  );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(ListingsService)
      .useValue({
        submitPublicContactRequest,
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
    submitPublicContactRequest.mockClear();
  });

  it('accepts valid contact payload without authentication', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/listings/101/contact')
      .set('user-agent', 'vitest-contact-e2e')
      .send({
        name: 'Mario Rossi',
        email: 'mario.rossi@example.test',
        phone: '+393401112233',
        message:
          'Ciao, sono interessato ad adottare il gatto. Possiamo sentirci domani pomeriggio?',
        privacyConsent: true,
      });

    expect(response.status).toBe(201);
    expect(response.body.contactRequest.id).toBe('contact-5001');
    expect(response.body.confirmation.message).toContain('Richiesta inviata');
    expect(submitPublicContactRequest).toHaveBeenCalledWith(
      '101',
      expect.objectContaining({
        senderName: 'Mario Rossi',
        senderEmail: 'mario.rossi@example.test',
      }),
      expect.objectContaining({
        userAgent: 'vitest-contact-e2e',
      }),
    );
  });

  it('validates contact payload fields', async () => {
    const response = await request(app.getHttpServer()).post('/v1/listings/101/contact').send({
      name: 'M',
      email: 'not-an-email',
      message: 'troppo corto',
      privacyConsent: false,
    });

    expect(response.status).toBe(400);
    expect(submitPublicContactRequest).not.toHaveBeenCalled();
  });

  it('blocks honeypot spam payload', async () => {
    const response = await request(app.getHttpServer()).post('/v1/listings/101/contact').send({
      name: 'Mario Rossi',
      email: 'mario.rossi@example.test',
      message: 'Messaggio sufficientemente lungo per passare la validazione del form contatti.',
      privacyConsent: true,
      website: 'https://spam.example.test',
    });

    expect(response.status).toBe(400);
    expect(submitPublicContactRequest).not.toHaveBeenCalled();
  });

  it('returns 404 when listing is not published or missing', async () => {
    submitPublicContactRequest.mockResolvedValueOnce(null);

    const response = await request(app.getHttpServer()).post('/v1/listings/999999/contact').send({
      name: 'Mario Rossi',
      email: 'mario.rossi@example.test',
      message: 'Messaggio sufficientemente lungo per passare la validazione del form contatti.',
      privacyConsent: true,
    });

    expect(response.status).toBe(404);
  });

  it('returns 429 when rate limit is exceeded', async () => {
    submitPublicContactRequest.mockRejectedValueOnce(
      new HttpException('Contact rate limit exceeded. Retry later.', HttpStatus.TOO_MANY_REQUESTS),
    );

    const response = await request(app.getHttpServer()).post('/v1/listings/101/contact').send({
      name: 'Mario Rossi',
      email: 'mario.rossi@example.test',
      message: 'Messaggio sufficientemente lungo per passare la validazione del form contatti.',
      privacyConsent: true,
    });

    expect(response.status).toBe(429);
  });
});
