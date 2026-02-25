import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { ModerationController } from './moderation.controller';
import { ModerationRepository } from './moderation.repository';
import { ModerationService } from './moderation.service';

@Module({
  imports: [ListingsModule],
  controllers: [ModerationController],
  providers: [ModerationRepository, ModerationService],
  exports: [ModerationRepository, ModerationService],
})
export class ModerationModule {}
