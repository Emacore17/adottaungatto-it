import { Module } from '@nestjs/common';
import { ListingsModule } from '../listings/listings.module';
import { PromotionsController } from './promotions.controller';
import { PromotionsRepository } from './promotions.repository';
import { PromotionsService } from './promotions.service';

@Module({
  imports: [ListingsModule],
  controllers: [PromotionsController],
  providers: [PromotionsRepository, PromotionsService],
  exports: [PromotionsRepository, PromotionsService],
})
export class PromotionsModule {}
