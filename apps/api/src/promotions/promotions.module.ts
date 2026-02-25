import { Module } from '@nestjs/common';
import { PromotionsController } from './promotions.controller';
import { PromotionsRepository } from './promotions.repository';
import { PromotionsService } from './promotions.service';

@Module({
  controllers: [PromotionsController],
  providers: [PromotionsRepository, PromotionsService],
  exports: [PromotionsRepository, PromotionsService],
})
export class PromotionsModule {}
