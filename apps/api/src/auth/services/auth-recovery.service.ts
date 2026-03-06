import { loadApiEnv } from '@adottaungatto/config';
import { Injectable, Logger } from '@nestjs/common';

interface KeycloakAdminUser {
  id: string;
  username?: string;
  email?: string;
}

interface ResendEmailVerificationInput {
  provider: 'keycloak' | 'dev-header';
  providerSubject: string;
  email: string;
  emailVerified?: boolean;
}

@Injectable()
export class AuthRecoveryService {
  private readonly env = loadApiEnv();
  private readonly logger = new Logger(AuthRecoveryService.name);
  private readonly keycloakBaseUrl = this.env.KEYCLOAK_URL.replace(/\/$/, '');

  async requestPasswordRecovery(identifier: string): Promise<void> {
    const normalizedIdentifier = identifier.trim();
    if (!normalizedIdentifier) {
      return;
    }

    try {
      const adminToken = await this.requestAdminToken();
      if (!adminToken) {
        return;
      }

      const user = await this.findUser(adminToken, normalizedIdentifier);
      if (!user?.id) {
        return;
      }

      await this.executeActionsEmail(adminToken, user.id, ['UPDATE_PASSWORD'], '/login');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Password recovery request failed silently: ${message}`);
    }
  }

  async resendEmailVerification(input: ResendEmailVerificationInput): Promise<void> {
    if (input.emailVerified === true) {
      return;
    }

    try {
      const adminToken = await this.requestAdminToken();
      if (!adminToken) {
        return;
      }

      const userId = await this.resolveUserIdForEmailVerification(adminToken, input);
      if (!userId) {
        return;
      }

      await this.executeActionsEmail(adminToken, userId, ['VERIFY_EMAIL'], '/verifica-account');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      this.logger.warn(`Email verification resend failed silently: ${message}`);
    }
  }

  private async requestAdminToken(): Promise<string | null> {
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
      this.logger.warn(`Unable to get Keycloak admin token (status=${response.status}).`);
      return null;
    }

    const payload = (await response.json()) as { access_token?: string };
    return typeof payload.access_token === 'string' ? payload.access_token : null;
  }

  private async findUser(accessToken: string, identifier: string): Promise<KeycloakAdminUser | null> {
    const realmPath = `/admin/realms/${this.env.KEYCLOAK_REALM}`;
    const byEmail = await this.findUsersByQuery(
      accessToken,
      `${realmPath}/users?email=${encodeURIComponent(identifier)}&exact=true`,
    );
    if (byEmail.length > 0) {
      return byEmail[0] ?? null;
    }

    const byUsername = await this.findUsersByQuery(
      accessToken,
      `${realmPath}/users?username=${encodeURIComponent(identifier)}&exact=true`,
    );

    return byUsername[0] ?? null;
  }

  private async findUsersByQuery(accessToken: string, path: string): Promise<KeycloakAdminUser[]> {
    const response = await fetch(`${this.keycloakBaseUrl}${path}`, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      return [];
    }

    const payload = (await response.json()) as unknown;
    return Array.isArray(payload) ? (payload as KeycloakAdminUser[]) : [];
  }

  private async executeActionsEmail(
    accessToken: string,
    userId: string,
    actions: string[],
    redirectPath: string,
  ): Promise<void> {
    const actionUrl = new URL(
      `${this.keycloakBaseUrl}/admin/realms/${this.env.KEYCLOAK_REALM}/users/${encodeURIComponent(userId)}/execute-actions-email`,
    );
    actionUrl.searchParams.set('client_id', this.env.KEYCLOAK_CLIENT_ID_WEB);
    actionUrl.searchParams.set(
      'redirect_uri',
      `${this.env.WEB_APP_URL.replace(/\/$/, '')}${redirectPath}`,
    );

    const response = await fetch(actionUrl, {
      method: 'PUT',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(actions),
    });

    if (!response.ok) {
      throw new Error(`Keycloak execute-actions-email failed with status ${response.status}.`);
    }
  }

  private async resolveUserIdForEmailVerification(
    accessToken: string,
    input: ResendEmailVerificationInput,
  ): Promise<string | null> {
    if (input.provider === 'keycloak') {
      const byId = await this.findUserById(accessToken, input.providerSubject);
      if (byId?.id) {
        return byId.id;
      }
    }

    const byEmail = await this.findUser(accessToken, input.email.trim());
    return byEmail?.id ?? null;
  }

  private async findUserById(accessToken: string, userId: string): Promise<KeycloakAdminUser | null> {
    const response = await fetch(
      `${this.keycloakBaseUrl}/admin/realms/${this.env.KEYCLOAK_REALM}/users/${encodeURIComponent(userId)}`,
      {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      return null;
    }

    const payload = (await response.json()) as unknown;
    if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) {
      return null;
    }

    const user = payload as KeycloakAdminUser;
    return typeof user.id === 'string' && user.id.length > 0 ? user : null;
  }
}
