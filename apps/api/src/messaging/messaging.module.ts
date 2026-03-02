import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { MessagingEventsService } from './messaging-events.service';
import { MessagingController } from './messaging.controller';
import { MessagingRepository } from './messaging.repository';
import { MessagingService } from './messaging.service';

@Module({
  imports: [UsersModule],
  controllers: [MessagingController],
  providers: [MessagingRepository, MessagingEventsService, MessagingService],
  exports: [MessagingRepository, MessagingEventsService, MessagingService],
})
export class MessagingModule {}
