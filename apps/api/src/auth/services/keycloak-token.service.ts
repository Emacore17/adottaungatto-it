import { loadApiEnv } from '@adottaungatto/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { type JWTPayload, createRemoteJWKSet, jwtVerify } from 'jose';
import { UserRole } from '../roles.enum';

interface KeycloakAccessBlock {
  roles?: string[];
}

interface KeycloakTokenPayload extends JWTPayload {
  azp?: string;
  email?: string;
  preferred_username?: string;
  realm_access?: KeycloakAccessBlock;
}

export interface VerifiedKeycloakToken {
  subject: string;
  email: string;
  roles: UserRole[];
}

const roleValues = new Set<string>(Object.values(UserRole));

@Injectable()
export class KeycloakTokenService {
  private readonly env = loadApiEnv();
  private readonly issuer =
    `${this.env.KEYCLOAK_URL.replace(/\/$/, '')}/realms/${this.env.KEYCLOAK_REALM}`;
  private readonly jwks = createRemoteJWKSet(
    new URL(`${this.issuer}/protocol/openid-connect/certs`),
  );
  private readonly allowedClientIds = new Set<string>([
    this.env.KEYCLOAK_CLIENT_ID_WEB,
    this.env.KEYCLOAK_CLIENT_ID_ADMIN,
    this.env.KEYCLOAK_CLIENT_ID_MOBILE,
  ]);

  async verifyBearerToken(token: string): Promise<VerifiedKeycloakToken> {
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: this.issuer,
      });

      return this.mapPayload(payload as KeycloakTokenPayload);
    } catch {
      throw new UnauthorizedException('Invalid or expired bearer token.');
    }
  }

  private mapPayload(payload: KeycloakTokenPayload): VerifiedKeycloakToken {
    if (!payload.sub) {
      throw new UnauthorizedException('Token is missing subject.');
    }

    if (!payload.azp || !this.allowedClientIds.has(payload.azp)) {
      throw new UnauthorizedException('Token client is not allowed for this API.');
    }

    const email = payload.email ?? `${payload.sub}@keycloak.local`;
    const roles = this.mapRoles(payload);

    return {
      subject: payload.sub,
      email,
      roles,
    };
  }

  private mapRoles(payload: KeycloakTokenPayload): UserRole[] {
    const rawRoles = payload.realm_access?.roles ?? [];
    const mappedRoles = rawRoles
      .map((role) => role.trim().toLowerCase())
      .filter((role): role is UserRole => roleValues.has(role));

    if (mappedRoles.length === 0) {
      return [UserRole.USER];
    }

    return Array.from(new Set(mappedRoles));
  }
}
