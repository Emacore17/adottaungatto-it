import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsRepository } from './listings.repository';
import { ListingsService } from './listings.service';
import { MinioStorageService } from './minio-storage.service';

@Module({
  controllers: [ListingsController],
  providers: [ListingsRepository, ListingsService, MinioStorageService],
  exports: [ListingsRepository, ListingsService, MinioStorageService],
})
export class ListingsModule {}
