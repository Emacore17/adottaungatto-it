import { Module } from '@nestjs/common';
import { AnalyticsModule } from '../analytics/analytics.module';
import { CatBreedsService } from './cat-breeds.service';
import { ListingsController } from './listings.controller';
import { ListingsRepository } from './listings.repository';
import { ListingsService } from './listings.service';
import { MinioStorageService } from './minio-storage.service';
import { SearchFallbackService } from './search-fallback.service';
import { SearchIndexService } from './search-index.service';

@Module({
  imports: [AnalyticsModule],
  controllers: [ListingsController],
  providers: [
    ListingsRepository,
    CatBreedsService,
    ListingsService,
    MinioStorageService,
    SearchIndexService,
    SearchFallbackService,
  ],
  exports: [
    ListingsRepository,
    CatBreedsService,
    ListingsService,
    MinioStorageService,
    SearchIndexService,
    SearchFallbackService,
  ],
})
export class ListingsModule {}
