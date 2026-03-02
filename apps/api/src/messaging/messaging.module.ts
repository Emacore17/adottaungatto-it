import { Module } from '@nestjs/common';
import { MessagingController } from './messaging.controller';
import { MessagingRepository } from './messaging.repository';
import { MessagingService } from './messaging.service';

@Module({
  controllers: [MessagingController],
  providers: [MessagingRepository, MessagingService],
  exports: [MessagingRepository, MessagingService],
})
export class MessagingModule {}
