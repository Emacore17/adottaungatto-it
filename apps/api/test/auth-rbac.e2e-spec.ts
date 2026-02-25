import { UnauthorizedException } from '@nestjs/common';
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { UserRole } from '../src/auth/roles.enum';
import { KeycloakTokenService } from '../src/auth/services/keycloak-token.service';

const userHeaders = {
  'x-auth-user-id': 'user-1',
  'x-auth-email': 'user-1@example.test',
  'x-auth-roles': 'user',
};

const moderatorHeaders = {
  'x-auth-user-id': 'mod-1',
  'x-auth-email': 'mod-1@example.test',
  'x-auth-roles': 'moderator',
};

const adminHeaders = {
  'x-auth-user-id': 'admin-1',
  'x-auth-email': 'admin-1@example.test',
  'x-auth-roles': 'admin',
};

const bearerAdminToken = 'bearer-admin-token';
const bearerInvalidToken = 'bearer-invalid-token';

describe('Auth RBAC', () => {
  let app: NestFastifyApplication;

  beforeAll(async () => {
    const keycloakTokenServiceMock: Pick<KeycloakTokenService, 'verifyBearerToken'> = {
      verifyBearerToken: async (token: string) => {
        if (token === bearerAdminToken) {
          return {
            subject: 'kc-admin-1',
            email: 'admin.demo@adottaungatto.local',
            roles: [UserRole.ADMIN],
          };
        }

        throw new UnauthorizedException('Invalid or expired bearer token.');
      },
    };

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(KeycloakTokenService)
      .useValue(keycloakTokenServiceMock)
      .compile();

    app = moduleRef.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
    await app.init();
    await app.getHttpAdapter().getInstance().ready();
  });

  afterAll(async () => {
    await app.close();
  });

  it('denies /v1/users/me without auth headers', async () => {
    const response = await request(app.getHttpServer()).get('/v1/users/me');
    expect(response.status).toBe(401);
  });

  it('allows /v1/users/me with user role', async () => {
    const response = await request(app.getHttpServer()).get('/v1/users/me').set(userHeaders);
    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe('user-1');
    expect(response.body.user.roles).toContain('user');
  });

  it('denies moderation area to normal user', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/users/moderation-space')
      .set(userHeaders);
    expect(response.status).toBe(403);
  });

  it('allows moderation area to moderator', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/users/moderation-space')
      .set(moderatorHeaders);
    expect(response.status).toBe(200);
    expect(response.body.scope).toBe('moderation');
  });

  it('denies admin area to moderator', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/users/admin-space')
      .set(moderatorHeaders);
    expect(response.status).toBe(403);
  });

  it('allows admin area to admin', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/users/admin-space')
      .set(adminHeaders);
    expect(response.status).toBe(200);
    expect(response.body.scope).toBe('admin');
  });

  it('allows admin area with valid bearer token', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/users/admin-space')
      .set('authorization', `Bearer ${bearerAdminToken}`);
    expect(response.status).toBe(200);
    expect(response.body.scope).toBe('admin');
  });

  it('denies invalid bearer token', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/users/me')
      .set('authorization', `Bearer ${bearerInvalidToken}`);
    expect(response.status).toBe(401);
  });
});
