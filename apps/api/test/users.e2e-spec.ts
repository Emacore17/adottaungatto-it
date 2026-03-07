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
  avatarObjectUrl: null,
  ...overrides,
});

const buildFavorites = (listingIds: string[] = ['101', '202']) =>
  listingIds.map((listingId, index) => ({
    listingId,
    addedAt: new Date(Date.now() - index * 1_000).toISOString(),
  }));

const buildLinkedIdentities = () => [
  {
    provider: 'keycloak',
    providerSubject: 'kc-user-1',
    emailAtLink: 'user-settings-1@example.test',
    linkedAt: new Date(Date.now() - 10_000).toISOString(),
    lastSeenAt: new Date(Date.now() - 1_000).toISOString(),
    isPrimary: true,
  },
  {
    provider: 'google',
    providerSubject: 'google-user-1',
    emailAtLink: 'user-settings-1@example.test',
    linkedAt: new Date(Date.now() - 5_000).toISOString(),
    lastSeenAt: new Date(Date.now() - 2_000).toISOString(),
    isPrimary: false,
  },
];

const buildSessions = () => [
  {
    sessionId: 'session-current',
    clientId: 'adottaungatto-web',
    ipAddress: '127.0.0.1',
    startedAt: new Date(Date.now() - 60_000).toISOString(),
    lastSeenAt: new Date(Date.now() - 1_000).toISOString(),
    isCurrent: true,
  },
  {
    sessionId: 'session-secondary',
    clientId: 'adottaungatto-web',
    ipAddress: '127.0.0.2',
    startedAt: new Date(Date.now() - 120_000).toISOString(),
    lastSeenAt: new Date(Date.now() - 30_000).toISOString(),
    isCurrent: false,
  },
];

type ConsentType = 'privacy' | 'terms' | 'marketing';

type ConsentPayload = {
  type: ConsentType;
  granted: boolean;
  version: string | null;
  grantedAt: string | null;
  source: string | null;
};

const buildConsents = (
  overrides: Partial<Record<ConsentType, Partial<Omit<ConsentPayload, 'type'>>>> = {},
) => {
  const now = new Date().toISOString();
  const defaults: Record<ConsentType, Omit<ConsentPayload, 'type'>> = {
    privacy: {
      granted: true,
      version: 'privacy-2026-03',
      grantedAt: now,
      source: 'account_settings',
    },
    terms: {
      granted: true,
      version: 'terms-2026-03',
      grantedAt: now,
      source: 'account_settings',
    },
    marketing: {
      granted: false,
      version: null,
      grantedAt: null,
      source: null,
    },
  };

  return (['privacy', 'terms', 'marketing'] as const).map((type) => ({
    type,
    ...defaults[type],
    ...(overrides[type] ?? {}),
  }));
};

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
  const uploadCurrentUserAvatar = vi.fn(async () =>
    buildProfile({
      avatarStorageKey: 'avatars/501/avatar.png',
      avatarObjectUrl: 'http://localhost:9000/user-avatars/avatars/501/avatar.png',
    }),
  );
  const removeCurrentUserAvatar = vi.fn(async () =>
    buildProfile({
      avatarStorageKey: null,
      avatarObjectUrl: null,
    }),
  );
  const resolveAvatarObjectUrl = vi.fn((avatarStorageKey: string | null) =>
    avatarStorageKey ? `http://localhost:9000/user-avatars/${avatarStorageKey}` : null,
  );
  const getCurrentUserConsents = vi.fn(async () => buildConsents());
  const updateCurrentUserConsents = vi.fn(async (_user, input) =>
    buildConsents(
      Object.fromEntries(
        input.consents.map((consent: { type: ConsentType }) => [consent.type, consent]),
      ) as Partial<Record<ConsentType, Partial<Omit<ConsentPayload, 'type'>>>>,
    ),
  );
  const listCurrentUserFavorites = vi.fn(async () => buildFavorites());
  const addCurrentUserFavorite = vi.fn(async (_user, listingId: string) =>
    buildFavorites([listingId, '202']),
  );
  const removeCurrentUserFavorite = vi.fn(async (_user, listingId: string) =>
    buildFavorites(['101', '202'].filter((favoriteId) => favoriteId !== listingId)),
  );
  const listCurrentUserLinkedIdentities = vi.fn(async () => buildLinkedIdentities());
  const startCurrentUserIdentityLink = vi.fn((_user, provider: string) => ({
    provider,
    redirectUrl: `http://localhost:3000/api/auth/login/${provider}?next=%2Faccount%2Fsicurezza`,
  }));
  const unlinkCurrentUserIdentity = vi.fn(async (_user, provider: string) =>
    buildLinkedIdentities().filter((linkedIdentity) => linkedIdentity.provider !== provider),
  );
  const listCurrentUserSessions = vi.fn(async () => buildSessions());
  const revokeCurrentUserSession = vi.fn(async (_user, sessionId: string) =>
    buildSessions().filter((session) => session.sessionId !== sessionId),
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
        uploadCurrentUserAvatar,
        removeCurrentUserAvatar,
        resolveAvatarObjectUrl,
        getCurrentUserConsents,
        updateCurrentUserConsents,
        listCurrentUserFavorites,
        addCurrentUserFavorite,
        removeCurrentUserFavorite,
        listCurrentUserLinkedIdentities,
        startCurrentUserIdentityLink,
        unlinkCurrentUserIdentity,
        listCurrentUserSessions,
        revokeCurrentUserSession,
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

  it('uploads avatar image payload', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/users/me/avatar')
      .set(userHeaders)
      .send({
        mimeType: 'image/png',
        contentBase64: Buffer.from('avatar-image').toString('base64'),
        fileName: 'avatar.png',
      });

    expect(response.status).toBe(201);
    expect(response.body.profile.avatarStorageKey).toBe('avatars/501/avatar.png');
    expect(response.body.profile.avatarObjectUrl).toContain('/user-avatars/avatars/501/avatar.png');
    expect(uploadCurrentUserAvatar).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        mimeType: 'image/png',
        originalFileName: 'avatar.png',
        payload: expect.any(Buffer),
      }),
    );
  });

  it('clears avatar profile image', async () => {
    const response = await request(app.getHttpServer()).delete('/v1/users/me/avatar').set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.profile.avatarStorageKey).toBeNull();
    expect(removeCurrentUserAvatar).toHaveBeenCalledWith(expect.any(Object));
  });

  it('validates avatar upload payload shape', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/users/me/avatar')
      .set(userHeaders)
      .send({
        mimeType: 'image/png',
      });

    expect(response.status).toBe(400);
    expect(uploadCurrentUserAvatar).not.toHaveBeenCalled();
  });

  it('returns authenticated user consents', async () => {
    const response = await request(app.getHttpServer()).get('/v1/users/me/consents').set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.consents).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ type: 'privacy' }),
        expect.objectContaining({ type: 'terms' }),
        expect.objectContaining({ type: 'marketing' }),
      ]),
    );
    expect(getCurrentUserConsents).toHaveBeenCalledTimes(1);
  });

  it('updates user consents', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/users/me/consents')
      .set(userHeaders)
      .set('user-agent', 'users-test-agent/1.0')
      .send({
        consents: [
          {
            type: 'marketing',
            granted: true,
            version: 'marketing-2026-03',
            source: 'account_settings',
          },
        ],
      });

    expect(response.status).toBe(200);
    expect(response.body.consents.find((consent: { type: string }) => consent.type === 'marketing')?.granted).toBe(true);
    expect(updateCurrentUserConsents).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        consents: [
          {
            type: 'marketing',
            granted: true,
            version: 'marketing-2026-03',
            source: 'account_settings',
          },
        ],
        userAgent: 'users-test-agent/1.0',
      }),
    );
  });

  it('validates consent payload shape', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/users/me/consents')
      .set(userHeaders)
      .send({
        consents: {
          type: 'privacy',
          granted: true,
          version: 'privacy-2026-03',
        },
      });

    expect(response.status).toBe(400);
    expect(updateCurrentUserConsents).not.toHaveBeenCalled();
  });

  it('validates duplicate consent types in payload', async () => {
    const response = await request(app.getHttpServer())
      .patch('/v1/users/me/consents')
      .set(userHeaders)
      .send({
        consents: [
          {
            type: 'privacy',
            granted: true,
            version: 'privacy-2026-03',
          },
          {
            type: 'privacy',
            granted: false,
            version: 'privacy-2026-03',
          },
        ],
      });

    expect(response.status).toBe(400);
    expect(updateCurrentUserConsents).not.toHaveBeenCalled();
  });

  it('returns authenticated user favorites', async () => {
    const response = await request(app.getHttpServer()).get('/v1/users/me/favorites').set(userHeaders);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body.favorites)).toBe(true);
    expect(response.body.favorites[0]?.listingId).toBe('101');
    expect(listCurrentUserFavorites).toHaveBeenCalledTimes(1);
  });

  it('adds a favorite listing', async () => {
    const response = await request(app.getHttpServer())
      .put('/v1/users/me/favorites/303')
      .set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.favorites[0]?.listingId).toBe('303');
    expect(addCurrentUserFavorite).toHaveBeenCalledWith(expect.any(Object), '303');
  });

  it('removes a favorite listing', async () => {
    const response = await request(app.getHttpServer())
      .delete('/v1/users/me/favorites/101')
      .set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.favorites.find((favorite: { listingId: string }) => favorite.listingId === '101')).toBeUndefined();
    expect(removeCurrentUserFavorite).toHaveBeenCalledWith(expect.any(Object), '101');
  });

  it('validates favorite listing id route param', async () => {
    const response = await request(app.getHttpServer())
      .put('/v1/users/me/favorites/abc')
      .set(userHeaders);

    expect(response.status).toBe(400);
    expect(addCurrentUserFavorite).not.toHaveBeenCalled();
  });

  it('returns authenticated user linked identities', async () => {
    const response = await request(app.getHttpServer())
      .get('/v1/users/me/linked-identities')
      .set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.linkedIdentities).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ provider: 'keycloak', isPrimary: true }),
        expect.objectContaining({ provider: 'google', isPrimary: false }),
      ]),
    );
    expect(listCurrentUserLinkedIdentities).toHaveBeenCalledWith(expect.any(Object));
  });

  it('starts linked identity flow for configured provider', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/users/me/linked-identities/google/start')
      .set(userHeaders);

    expect(response.status).toBe(201);
    expect(response.body.provider).toBe('google');
    expect(response.body.redirectUrl).toContain('/api/auth/login/google');
    expect(startCurrentUserIdentityLink).toHaveBeenCalledWith(expect.any(Object), 'google');
  });

  it('validates linked identity provider alias', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/users/me/linked-identities/google!/start')
      .set(userHeaders);

    expect(response.status).toBe(400);
    expect(startCurrentUserIdentityLink).not.toHaveBeenCalled();
  });

  it('unlinks secondary identity provider', async () => {
    const response = await request(app.getHttpServer())
      .delete('/v1/users/me/linked-identities/google')
      .set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.linkedIdentities.find((identity: { provider: string }) => identity.provider === 'google')).toBeUndefined();
    expect(unlinkCurrentUserIdentity).toHaveBeenCalledWith(expect.any(Object), 'google');
  });

  it('returns active sessions', async () => {
    const response = await request(app.getHttpServer()).get('/v1/users/me/sessions').set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.sessions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ sessionId: 'session-current', isCurrent: true }),
        expect.objectContaining({ sessionId: 'session-secondary', isCurrent: false }),
      ]),
    );
    expect(listCurrentUserSessions).toHaveBeenCalledWith(expect.any(Object));
  });

  it('revokes selected session', async () => {
    const response = await request(app.getHttpServer())
      .delete('/v1/users/me/sessions/session-secondary')
      .set(userHeaders);

    expect(response.status).toBe(200);
    expect(response.body.sessions.find((session: { sessionId: string }) => session.sessionId === 'session-secondary')).toBeUndefined();
    expect(revokeCurrentUserSession).toHaveBeenCalledWith(expect.any(Object), 'session-secondary');
  });

  it('validates session id route param', async () => {
    const response = await request(app.getHttpServer())
      .delete('/v1/users/me/sessions/%20')
      .set(userHeaders);

    expect(response.status).toBe(400);
    expect(revokeCurrentUserSession).not.toHaveBeenCalled();
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
