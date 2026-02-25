import { Module } from '@nestjs/common';
import { AnalyticsModule } from './analytics/analytics.module';
import { AuthModule } from './auth/auth.module';
import { GeographyModule } from './geography/geography.module';
import { HealthController } from './health/health.controller';
import { ListingsModule } from './listings/listings.module';
import { ModerationModule } from './moderation/moderation.module';
import { PromotionsModule } from './promotions/promotions.module';
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
})
export class AppModule {}
