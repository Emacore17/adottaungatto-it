import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PublicRateLimitGuard } from '../security/public-rate-limit.guard';
import { UsersModule } from '../users/users.module';
import { HeaderAuthGuard } from './guards/header-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { KeycloakTokenService } from './services/keycloak-token.service';

@Module({
  imports: [UsersModule],
  providers: [
    KeycloakTokenService,
    {
      provide: APP_GUARD,
      useClass: HeaderAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PublicRateLimitGuard,
    },
  ],
})
export class AuthModule {}
