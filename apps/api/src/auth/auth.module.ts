import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { PublicRateLimitGuard } from '../security/public-rate-limit.guard';
import { PublicRateLimitStore } from '../security/public-rate-limit.store';
import { UsersModule } from '../users/users.module';
import { AuthController } from './auth.controller';
import { HeaderAuthGuard } from './guards/header-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { VerifiedEmailGuard } from './guards/verified-email.guard';
import { AuthPhoneVerificationService } from './services/auth-phone-verification.service';
import { AuthPhoneVerificationDeliveryService } from './services/auth-phone-verification-delivery.service';
import { AuthRecoveryService } from './services/auth-recovery.service';
import { AuthSecurityEventsService } from './services/auth-security-events.service';
import { KeycloakTokenService } from './services/keycloak-token.service';

@Module({
  imports: [UsersModule],
  controllers: [AuthController],
  providers: [
    KeycloakTokenService,
    AuthRecoveryService,
    AuthPhoneVerificationDeliveryService,
    AuthPhoneVerificationService,
    AuthSecurityEventsService,
    PublicRateLimitStore,
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
      useClass: VerifiedEmailGuard,
    },
    {
      provide: APP_GUARD,
      useClass: PublicRateLimitGuard,
    },
  ],
})
export class AuthModule {}
