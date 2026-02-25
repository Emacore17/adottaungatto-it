import { Module } from '@nestjs/common';
import { AdminAnalyticsController, AnalyticsController } from './analytics.controller';
import { AnalyticsRepository } from './analytics.repository';
import { AnalyticsService } from './analytics.service';

@Module({
  controllers: [AnalyticsController, AdminAnalyticsController],
  providers: [AnalyticsRepository, AnalyticsService],
  exports: [AnalyticsRepository, AnalyticsService],
})
export class AnalyticsModule {}
