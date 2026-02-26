import { Module } from '@nestjs/common';
import { APP_FILTER, APP_INTERCEPTOR } from '@nestjs/core';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { GeographyModule } from './geography/geography.module';
import { HealthController } from './health/health.controller';
import { ListingsModule } from './listings/listings.module';
import { ModerationModule } from './moderation/moderation.module';
import { SentryExceptionFilter } from './observability/sentry-exception.filter';
import { PromotionsModule } from './promotions/promotions.module';
import { SecurityHeadersInterceptor } from './security/security-headers.interceptor';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    AnalyticsModule,
    GeographyModule,
    ListingsModule,
    ModerationModule,
    PromotionsModule,
  ],
  controllers: [HealthController],
  providers: [
    {
      provide: APP_FILTER,
      useClass: SentryExceptionFilter,
    },
    {
      provide: APP_INTERCEPTOR,
      useClass: SecurityHeadersInterceptor,
    },
  ],
})
export class AppModule {}
