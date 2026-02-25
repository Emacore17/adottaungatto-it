import { Module } from '@nestjs/common';
import { ListingsController } from './listings.controller';
import { ListingsRepository } from './listings.repository';
import { ListingsService } from './listings.service';
import { MinioStorageService } from './minio-storage.service';
import { SearchFallbackService } from './search-fallback.service';
import { SearchIndexService } from './search-index.service';

@Module({
  controllers: [ListingsController],
  providers: [
    ListingsRepository,
    ListingsService,
    MinioStorageService,
    SearchIndexService,
    SearchFallbackService,
  ],
  exports: [
    ListingsRepository,
    ListingsService,
    MinioStorageService,
    SearchIndexService,
    SearchFallbackService,
  ],
})
export class ListingsModule {}
