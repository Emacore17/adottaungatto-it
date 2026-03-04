import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { UsersService } from '../src/users/users.service';

const userHeaders = {
  'x-auth-user-id': 'user-settings-1',
  'x-auth-email': 'user-settings-1@example.test',
  'x-auth-roles': 'user',
};

const buildUser = (messageEmailNotificationsEnabled = true) => ({
  id: 'user-settings-1',
  databaseId: '501',
  provider: 'dev-header',
  providerSubject: 'user-settings-1',
  email: 'user-settings-1@example.test',
  roles: ['user'],
  preferences: {
    messageEmailNotificationsEnabled,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

describe('Users endpoints', () => {
  let app: NestFastifyApplication;

  const getCurrentUser = vi.fn(async () => buildUser(true));
  const updateCurrentUserMessagingPreferences = vi.fn(async (_user, input) =>
    buildUser(input.messageEmailNotificationsEnabled),
  );

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(UsersService)
      .useValue({
        upsertFromIdentity: vi.fn(() => buildUser(true)),
        getCurrentUser,
        updateCurrentUserMessagingPreferences,
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
    vi.clearAllMocks();
  });

  it('returns the authenticated user profile with message preferences', async () => {
    const response = await request(app.getHttpServer()).get('/v1/users/me').set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.user.id).toBe('user-settings-1');
    expect(response.body.user.providerSubject).toBe('user-settings-1');
    expect(response.body.user).not.toHaveProperty('databaseId');
    expect(response.body.user.preferences.messageEmailNotificationsEnabled).toBe(true);
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('updates messaging preferences for the authenticated user', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/users/me/preferences')
      .set(userHeaders)
      .send({
        messageEmailNotificationsEnabled: false,
      });

    expect(response.status).toBe(200);
    expect(response.body.user.preferences.messageEmailNotificationsEnabled).toBe(false);
    expect(updateCurrentUserMessagingPreferences).toHaveBeenCalledWith(expect.any(Object), {
      messageEmailNotificationsEnabled: false,
    });
  });

  it('validates preference payload type', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/users/me/preferences')
      .set(userHeaders)
      .send({
        messageEmailNotificationsEnabled: 'false',
      });

    expect(response.status).toBe(400);
    expect(updateCurrentUserMessagingPreferences).not.toHaveBeenCalled();
  });
});
