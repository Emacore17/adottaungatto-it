import { loadApiEnv } from '@adottaungatto/config';
import {
  BadRequestException,
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { RequestUser } from '../auth/interfaces/request-user.interface';
import { MinioStorageService } from '../listings/minio-storage.service';
import type {
  AppUser,
  IdentityClaims,
  UserAvatarUploadInput,
  UserConsent,
  UserConsentUpdateInput,
  UserFavoriteListing,
  UserLinkedIdentity,
  UserProfile,
  UserProfileUpdateInput,
  UserSessionRecord,
} from './models/app-user.model';
import { UsersRepository } from './users.repository';

interface KeycloakFederatedIdentity {
  identityProvider?: string;
  userId?: string;
  userName?: string;
}

interface KeycloakUserSession {
  id?: string;
  ipAddress?: string;
  start?: number;
  lastAccess?: number;
  clients?: Record<string, string>;
}

const normalizeProviderAlias = (provider: string): string => provider.trim().toLowerCase();

const isProviderAlias = (provider: string): boolean =>
  /^[a-z0-9][a-z0-9_-]{0,62}$/.test(provider);

const parseEpochToIso = (value: unknown): string | null => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    return null;
  }

  const epochMilliseconds = value < 10_000_000_000 ? value * 1_000 : value;
  return new Date(epochMilliseconds).toISOString();
};

@Injectable()
export class UsersService {
  private readonly usersByIdentityKey = new Map<string, AppUser>();
  private readonly env = loadApiEnv();
  private readonly keycloakBaseUrl = this.env.KEYCLOAK_URL.replace(/\/$/, '');
  private readonly enabledSocialProviders = new Set(this.env.KEYCLOAK_SOCIAL_PROVIDERS);

  constructor(
    @Inject(UsersRepository)
    private readonly usersRepository: UsersRepository,
    @Inject(MinioStorageService)
    private readonly minioStorageService: MinioStorageService,
  ) {}

  upsertFromIdentity(claims: IdentityClaims): AppUser {
    const identityKey = `${claims.provider}:${claims.providerSubject}`;
    const now = new Date().toISOString();
    const existing = this.usersByIdentityKey.get(identityKey);

    if (existing) {
      const updatedUser: AppUser = {
        ...existing,
        authSessionId: claims.authSessionId ?? existing.authSessionId ?? null,
        authClientId: claims.authClientId ?? existing.authClientId ?? null,
        email: claims.email,
        emailVerified: claims.emailVerified ?? existing.emailVerified,
        roles: claims.roles,
        preferences: existing.preferences,
        updatedAt: now,
      };
      this.usersByIdentityKey.set(identityKey, updatedUser);
      return updatedUser;
    }

    const createdUser: AppUser = {
      id: claims.providerSubject,
      databaseId: null,
      provider: claims.provider,
      providerSubject: claims.providerSubject,
      authSessionId: claims.authSessionId ?? null,
      authClientId: claims.authClientId ?? null,
      email: claims.email,
      emailVerified: claims.emailVerified,
      roles: claims.roles,
      preferences: {
        messageEmailNotificationsEnabled: true,
      },
      createdAt: now,
      updatedAt: now,
    };

    this.usersByIdentityKey.set(identityKey, createdUser);
    return createdUser;
  }

  async getCurrentUser(user: RequestUser): Promise<AppUser> {
    const persistedUser = await this.usersRepository.upsertFromIdentityClaims(this.toIdentityClaims(user));

    const userWithClaims: AppUser = {
      ...persistedUser,
      authSessionId: user.authSessionId ?? null,
      authClientId: user.authClientId ?? null,
      emailVerified: user.emailVerified ?? persistedUser.emailVerified,
    };

    this.usersByIdentityKey.set(`${user.provider}:${user.providerSubject}`, userWithClaims);
    return userWithClaims;
  }

  async updateCurrentUserMessagingPreferences(
    user: RequestUser,
    input: {
      messageEmailNotificationsEnabled: boolean;
    },
  ): Promise<AppUser> {
    const persistedUser = await this.usersRepository.updateMessagePreferences(
      this.toIdentityClaims(user),
      input,
    );

    const userWithClaims: AppUser = {
      ...persistedUser,
      authSessionId: user.authSessionId ?? null,
      authClientId: user.authClientId ?? null,
      emailVerified: user.emailVerified ?? persistedUser.emailVerified,
    };

    this.usersByIdentityKey.set(`${user.provider}:${user.providerSubject}`, userWithClaims);
    return userWithClaims;
  }

  async getCurrentUserProfile(user: RequestUser): Promise<UserProfile> {
    return this.usersRepository.getProfileByIdentityClaims(this.toIdentityClaims(user));
  }

  async updateCurrentUserProfile(
    user: RequestUser,
    input: UserProfileUpdateInput,
  ): Promise<UserProfile> {
    return this.usersRepository.updateProfile(this.toIdentityClaims(user), input);
  }

  async uploadCurrentUserAvatar(
    user: RequestUser,
    input: UserAvatarUploadInput,
  ): Promise<UserProfile> {
    const claims = this.toIdentityClaims(user);
    const currentProfile = await this.usersRepository.getProfileByIdentityClaims(claims);
    const persistedUser = await this.usersRepository.upsertFromIdentityClaims(claims);
    const userStorageId = persistedUser.databaseId ?? persistedUser.providerSubject;

    const uploadResult = await this.minioStorageService.uploadUserAvatar({
      userStorageId,
      mimeType: input.mimeType,
      payload: input.payload,
      originalFileName: input.originalFileName,
    });

    try {
      const updatedProfile = await this.usersRepository.setAvatarStorageKey(
        claims,
        uploadResult.storageKey,
      );

      if (
        currentProfile.avatarStorageKey &&
        currentProfile.avatarStorageKey !== uploadResult.storageKey
      ) {
        await this.minioStorageService.deleteUserAvatarObject(currentProfile.avatarStorageKey);
      }

      return updatedProfile;
    } catch (error) {
      await this.minioStorageService.deleteUserAvatarObject(uploadResult.storageKey);
      throw error;
    }
  }

  async removeCurrentUserAvatar(user: RequestUser): Promise<UserProfile> {
    const claims = this.toIdentityClaims(user);
    const currentProfile = await this.usersRepository.getProfileByIdentityClaims(claims);
    const updatedProfile = await this.usersRepository.setAvatarStorageKey(claims, null);

    if (currentProfile.avatarStorageKey) {
      await this.minioStorageService.deleteUserAvatarObject(currentProfile.avatarStorageKey);
    }

    return updatedProfile;
  }

  resolveAvatarObjectUrl(avatarStorageKey: string | null): string | null {
    if (!avatarStorageKey) {
      return null;
    }

    return this.minioStorageService.getUserAvatarObjectUrl(avatarStorageKey);
  }

  async markCurrentUserPhoneVerified(user: RequestUser, phoneE164: string): Promise<UserProfile> {
    return this.usersRepository.markPhoneVerified(this.toIdentityClaims(user), phoneE164);
  }

  async getCurrentUserConsents(user: RequestUser): Promise<UserConsent[]> {
    return this.usersRepository.getConsentsByIdentityClaims(this.toIdentityClaims(user));
  }

  async updateCurrentUserConsents(
    user: RequestUser,
    input: {
      consents: UserConsentUpdateInput[];
      ip: string | null;
      userAgent: string | null;
    },
  ): Promise<UserConsent[]> {
    return this.usersRepository.appendConsentsByIdentityClaims(this.toIdentityClaims(user), input);
  }

  async listCurrentUserFavorites(user: RequestUser): Promise<UserFavoriteListing[]> {
    return this.usersRepository.listFavoritesByIdentityClaims(this.toIdentityClaims(user));
  }

  async addCurrentUserFavorite(user: RequestUser, listingId: string): Promise<UserFavoriteListing[]> {
    const listingExists = await this.usersRepository.listingExistsForFavorite(listingId);
    if (!listingExists) {
      throw new NotFoundException('Listing not found.');
    }

    return this.usersRepository.addFavoriteByIdentityClaims(this.toIdentityClaims(user), listingId);
  }

  async removeCurrentUserFavorite(
    user: RequestUser,
    listingId: string,
  ): Promise<UserFavoriteListing[]> {
    return this.usersRepository.removeFavoriteByIdentityClaims(this.toIdentityClaims(user), listingId);
  }

  async listCurrentUserLinkedIdentities(user: RequestUser): Promise<UserLinkedIdentity[]> {
    const claims = this.toIdentityClaims(user);

    await this.usersRepository.upsertLinkedIdentityByIdentityClaims(claims, {
      provider: claims.provider,
      providerSubject: claims.providerSubject,
      emailAtLink: claims.email,
    });

    if (claims.provider === 'keycloak') {
      await this.syncLinkedIdentitiesFromKeycloakBestEffort(claims);
    }

    return this.usersRepository.listLinkedIdentitiesByIdentityClaims(claims);
  }

  startCurrentUserIdentityLink(
    user: RequestUser,
    provider: string,
  ): {
    provider: string;
    redirectUrl: string;
  } {
    const normalizedProvider = normalizeProviderAlias(provider);
    if (!isProviderAlias(normalizedProvider)) {
      throw new BadRequestException('Linked identity provider alias is invalid.');
    }

    if (!this.enabledSocialProviders.has(normalizedProvider)) {
      throw new BadRequestException('Linked identity provider is not enabled.');
    }

    if (user.provider !== 'keycloak') {
      throw new BadRequestException('Linked identities are available only for keycloak accounts.');
    }

    if (normalizedProvider === 'keycloak' || normalizedProvider === 'dev-header') {
      throw new BadRequestException('Primary provider cannot be linked as secondary identity.');
    }

    const nextPath = `/account/sicurezza?linkedIdentity=started&provider=${encodeURIComponent(
      normalizedProvider,
    )}`;
    const redirectUrl = `${this.env.WEB_APP_URL.replace(
      /\/$/,
      '',
    )}/api/auth/login/${encodeURIComponent(normalizedProvider)}?next=${encodeURIComponent(nextPath)}`;

    return {
      provider: normalizedProvider,
      redirectUrl,
    };
  }

  async unlinkCurrentUserIdentity(user: RequestUser, provider: string): Promise<UserLinkedIdentity[]> {
    const normalizedProvider = normalizeProviderAlias(provider);
    if (!isProviderAlias(normalizedProvider)) {
      throw new BadRequestException('Linked identity provider alias is invalid.');
    }

    if (normalizedProvider === 'keycloak' || normalizedProvider === 'dev-header') {
      throw new BadRequestException('Primary provider cannot be unlinked.');
    }

    if (!this.enabledSocialProviders.has(normalizedProvider)) {
      throw new BadRequestException('Linked identity provider is not enabled.');
    }

    const claims = this.toIdentityClaims(user);
    if (claims.provider !== 'keycloak') {
      throw new BadRequestException('Linked identities are available only for keycloak accounts.');
    }

    const adminToken = await this.requestKeycloakAdminTokenOrThrow();
    const removedFromKeycloak = await this.deleteKeycloakFederatedIdentity(
      adminToken,
      claims.providerSubject,
      normalizedProvider,
    );
    if (!removedFromKeycloak) {
      throw new NotFoundException('Linked identity not found.');
    }

    await this.usersRepository.deleteLinkedIdentityByProviderByIdentityClaims(
      claims,
      normalizedProvider,
    );

    return this.listCurrentUserLinkedIdentities(user);
  }

  async listCurrentUserSessions(user: RequestUser): Promise<UserSessionRecord[]> {
    const claims = this.toIdentityClaims(user);
    if (claims.provider !== 'keycloak') {
      return [];
    }

    const adminToken = await this.requestKeycloakAdminTokenOrThrow();
    const sessions = await this.fetchKeycloakUserSessions(adminToken, claims.providerSubject);

    const mapped = sessions
      .filter((session) => typeof session.id === 'string' && session.id.length > 0)
      .map((session) => {
        const clientId =
          typeof session.clients === 'object' && session.clients !== null
            ? Object.keys(session.clients)[0] ?? null
            : null;

        return {
          sessionId: session.id as string,
          clientId,
          ipAddress: typeof session.ipAddress === 'string' ? session.ipAddress : null,
          startedAt: parseEpochToIso(session.start),
          lastSeenAt: parseEpochToIso(session.lastAccess),
          isCurrent: claims.authSessionId === session.id,
        } satisfies UserSessionRecord;
      });

    return mapped.sort((left, right) => {
      if (left.isCurrent !== right.isCurrent) {
        return left.isCurrent ? -1 : 1;
      }

      const leftDate = left.lastSeenAt ? Date.parse(left.lastSeenAt) : 0;
      const rightDate = right.lastSeenAt ? Date.parse(right.lastSeenAt) : 0;
      return rightDate - leftDate;
    });
  }

  async revokeCurrentUserSession(user: RequestUser, sessionId: string): Promise<UserSessionRecord[]> {
    const normalizedSessionId = sessionId.trim();
    if (!normalizedSessionId) {
      throw new BadRequestException('Session id is required.');
    }

    const claims = this.toIdentityClaims(user);
    if (claims.provider !== 'keycloak') {
      throw new BadRequestException('Session revocation is available only for keycloak accounts.');
    }

    const adminToken = await this.requestKeycloakAdminTokenOrThrow();
    const revoked = await this.revokeKeycloakSession(adminToken, normalizedSessionId);
    if (!revoked) {
      throw new NotFoundException('Session not found.');
    }

    return this.listCurrentUserSessions(user);
  }

  private async syncLinkedIdentitiesFromKeycloakBestEffort(claims: IdentityClaims): Promise<void> {
    try {
      const adminToken = await this.requestKeycloakAdminToken();
      if (!adminToken) {
        return;
      }

      const federatedIdentities = await this.fetchKeycloakFederatedIdentities(
        adminToken,
        claims.providerSubject,
      );
      const keepProviders: string[] = [];

      for (const identity of federatedIdentities) {
        const provider = normalizeProviderAlias(identity.identityProvider ?? '');
        const providerSubject = identity.userId?.trim() ?? '';

        if (!isProviderAlias(provider) || !providerSubject) {
          continue;
        }

        keepProviders.push(provider);
        await this.usersRepository.upsertLinkedIdentityByIdentityClaims(claims, {
          provider,
          providerSubject,
          emailAtLink:
            typeof identity.userName === 'string' && identity.userName.trim().length > 0
              ? identity.userName.trim()
              : claims.email,
        });
      }

      await this.usersRepository.pruneLinkedIdentitiesByIdentityClaims(
        claims,
        Array.from(new Set(keepProviders)),
      );
    } catch {}
  }

  private async requestKeycloakAdminToken(): Promise<string | null> {
    const tokenUrl = `${this.keycloakBaseUrl}/realms/${this.env.KEYCLOAK_ADMIN_REALM}/protocol/openid-connect/token`;
    const formData = new URLSearchParams();
    formData.set('grant_type', 'password');
    formData.set('client_id', this.env.KEYCLOAK_ADMIN_CLIENT_ID);
    formData.set('username', this.env.KEYCLOAK_ADMIN);
    formData.set('password', this.env.KEYCLOAK_ADMIN_PASSWORD);

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/x-www-form-urlencoded',
      },
      body: formData,
    });

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as { access_token?: string };
    return typeof payload.access_token === 'string' && payload.access_token.length > 0
      ? payload.access_token
      : null;
  }

  private async requestKeycloakAdminTokenOrThrow(): Promise<string> {
    const token = await this.requestKeycloakAdminToken();
    if (!token) {
      throw new ServiceUnavailableException('Keycloak admin integration is unavailable.');
    }

    return token;
  }

  private async fetchKeycloakFederatedIdentities(
    accessToken: string,
    keycloakUserId: string,
  ): Promise<KeycloakFederatedIdentity[]> {
    const response = await fetch(
      `${this.keycloakBaseUrl}/admin/realms/${this.env.KEYCLOAK_REALM}/users/${encodeURIComponent(
        keycloakUserId,
      )}/federated-identity`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('Unable to read linked identities from Keycloak.');
    }

    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as KeycloakFederatedIdentity[]) : [];
  }

  private async deleteKeycloakFederatedIdentity(
    accessToken: string,
    keycloakUserId: string,
    provider: string,
  ): Promise<boolean> {
    const response = await fetch(
      `${this.keycloakBaseUrl}/admin/realms/${this.env.KEYCLOAK_REALM}/users/${encodeURIComponent(
        keycloakUserId,
      )}/federated-identity/${encodeURIComponent(provider)}`,
      {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (response.status === 404) {
      return false;
    }

    if (response.status !== 204) {
      throw new ServiceUnavailableException('Unable to unlink identity from Keycloak.');
    }

    return true;
  }

  private async fetchKeycloakUserSessions(
    accessToken: string,
    keycloakUserId: string,
  ): Promise<KeycloakUserSession[]> {
    const response = await fetch(
      `${this.keycloakBaseUrl}/admin/realms/${this.env.KEYCLOAK_REALM}/users/${encodeURIComponent(
        keycloakUserId,
      )}/sessions`,
      {
        method: 'GET',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (response.status === 404) {
      return [];
    }

    if (!response.ok) {
      throw new ServiceUnavailableException('Unable to read user sessions from Keycloak.');
    }

    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as KeycloakUserSession[]) : [];
  }

  private async revokeKeycloakSession(accessToken: string, sessionId: string): Promise<boolean> {
    const response = await fetch(
      `${this.keycloakBaseUrl}/admin/realms/${this.env.KEYCLOAK_REALM}/sessions/${encodeURIComponent(
        sessionId,
      )}`,
      {
        method: 'DELETE',
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (response.status === 404) {
      return false;
    }

    if (response.status !== 204) {
      throw new ServiceUnavailableException('Unable to revoke session on Keycloak.');
    }

    return true;
  }

  private toIdentityClaims(user: RequestUser): IdentityClaims {
    return {
      provider: user.provider,
      providerSubject: user.providerSubject,
      authSessionId: user.authSessionId,
      authClientId: user.authClientId,
      email: user.email,
      emailVerified: user.emailVerified,
      roles: user.roles,
    };
  }
}
