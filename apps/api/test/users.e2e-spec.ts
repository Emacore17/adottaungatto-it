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
  emailVerified: true,
  roles: ['user'],
  preferences: {
    messageEmailNotificationsEnabled,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});

const buildProfile = (overrides: Partial<Record<string, string | null>> = {}) => ({
  firstName: null,
  lastName: null,
  displayName: 'Gatto Lover',
  phoneE164: null,
  phoneVerifiedAt: null,
  city: 'Milano',
  province: 'MI',
  bio: null,
  avatarStorageKey: null,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('Users endpoints', () => {
  let app: NestFastifyApplication;

  const getCurrentUser = vi.fn(async () => buildUser(true));
  const updateCurrentUserMessagingPreferences = vi.fn(async (_user, input) =>
    buildUser(input.messageEmailNotificationsEnabled),
  );
  const getCurrentUserProfile = vi.fn(async () => buildProfile());
  const updateCurrentUserProfile = vi.fn(async (_user, input) =>
    buildProfile({
      firstName: input.firstName ?? null,
      lastName: input.lastName ?? null,
      displayName: input.displayName ?? 'Gatto Lover',
      phoneE164: input.phoneE164 ?? null,
      city: input.city ?? 'Milano',
      province: input.province ?? 'MI',
      bio: input.bio ?? null,
    }),
  );
  const setCurrentUserAvatarStorageKey = vi.fn(async (_user, avatarStorageKey) =>
    buildProfile({
      avatarStorageKey,
    }),
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
        getCurrentUserProfile,
        updateCurrentUserProfile,
        setCurrentUserAvatarStorageKey,
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
    expect(response.body.user.emailVerified).toBe(true);
    expect(response.body.user.preferences.messageEmailNotificationsEnabled).toBe(true);
    expect(getCurrentUser).toHaveBeenCalledTimes(1);
  });

  it('returns the authenticated user profile details', async () => {
    const response = await request(app.getHttpServer()).get('/v1/users/me/profile').set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.profile.displayName).toBe('Gatto Lover');
    expect(response.body.profile.city).toBe('Milano');
    expect(getCurrentUserProfile).toHaveBeenCalledTimes(1);
  });

  it('updates personal profile fields', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/users/me/profile')
      .set(userHeaders)
      .send({
        firstName: 'Mario',
        lastName: 'Rossi',
        city: 'Roma',
      });

    expect(response.status).toBe(200);
    expect(response.body.profile.firstName).toBe('Mario');
    expect(response.body.profile.lastName).toBe('Rossi');
    expect(response.body.profile.city).toBe('Roma');
    expect(updateCurrentUserProfile).toHaveBeenCalledWith(expect.any(Object), {
      firstName: 'Mario',
      lastName: 'Rossi',
      displayName: undefined,
      phoneE164: undefined,
      city: 'Roma',
      province: undefined,
      bio: undefined,
    });
  });

  it('updates avatar storage key', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/users/me/avatar')
      .set(userHeaders)
      .send({
        avatarStorageKey: 'avatars/user-settings-1/avatar.webp',
      });

    expect(response.status).toBe(201);
    expect(response.body.profile.avatarStorageKey).toBe('avatars/user-settings-1/avatar.webp');
    expect(setCurrentUserAvatarStorageKey).toHaveBeenCalledWith(
      expect.any(Object),
      'avatars/user-settings-1/avatar.webp',
    );
  });

  it('clears avatar storage key', async () => {
    const response = await request(app.getHttpServer()).delete('/v1/users/me/avatar').set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.profile.avatarStorageKey).toBeNull();
    expect(setCurrentUserAvatarStorageKey).toHaveBeenCalledWith(expect.any(Object), null);
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
