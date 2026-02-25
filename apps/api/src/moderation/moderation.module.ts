import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { ListingsModule } from '../listings/listings.module';
import { ModerationController } from './moderation.controller';
import { ModerationRepository } from './moderation.repository';
import { ModerationService } from './moderation.service';

@Module({
  imports: [ListingsModule, AnalyticsModule],
  controllers: [ModerationController],
  providers: [ModerationRepository, ModerationService],
  exports: [ModerationRepository, ModerationService],
})
export class ModerationModule {}
