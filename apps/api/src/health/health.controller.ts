import type { HealthResponse } from '@adottaungatto/types';
import { Controller, Get, Inject } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { SearchIndexService } from '../listings/search-index.service';

@Controller()
export class HealthController {
  constructor(
    @Inject(SearchIndexService) private readonly searchIndexService: SearchIndexService,
  ) {}

  @Public()
  @Get('/health')
  getHealth(): HealthResponse {
    return {
      status: 'ok',
      service: 'api',
      timestamp: new Date().toISOString(),
    };
  }

  @Public()
  @Get('/health/search')
  async getSearchHealth() {
    const reachable = await this.searchIndexService.ping();

    return {
      status: reachable ? 'ok' : 'degraded',
      service: 'search',
      index: this.searchIndexService.getIndexName(),
      timestamp: new Date().toISOString(),
    };
  }
}
