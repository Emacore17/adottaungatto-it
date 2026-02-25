import { BadRequestException, Controller, Get, Inject, Query } from '@nestjs/common';
import { Public } from '../auth/decorators/public.decorator';
import { GeographyService } from './geography.service';

const isPositiveIntegerString = (value: string): boolean => /^[1-9]\d*$/.test(value);

@Public()
@Controller('v1/geography')
export class GeographyController {
  constructor(
    @Inject(GeographyService)
    private readonly geographyService: GeographyService,
  ) {}

  @Get('regions')
  async getRegions() {
    const regions = await this.geographyService.findRegions();
    return { regions };
  }

  @Get('provinces')
  async getProvinces(@Query('regionId') regionId: string | undefined) {
    if (!regionId || !isPositiveIntegerString(regionId)) {
      throw new BadRequestException('Query parameter "regionId" is required and must be numeric.');
    }

    const provinces = await this.geographyService.findProvincesByRegionId(regionId);
    return { provinces };
  }

  @Get('comuni')
  async getComuni(@Query('provinceId') provinceId: string | undefined) {
    if (!provinceId || !isPositiveIntegerString(provinceId)) {
      throw new BadRequestException(
        'Query parameter "provinceId" is required and must be numeric.',
      );
    }

    const comuni = await this.geographyService.findComuniByProvinceId(provinceId);
    return { comuni };
  }

  @Get('search')
  async search(
    @Query('q') rawQuery: string | undefined,
    @Query('limit') rawLimit: string | undefined,
  ) {
    const query = rawQuery?.trim();
    if (!query || query.length < 2) {
      throw new BadRequestException(
        'Query parameter "q" is required and must contain at least 2 characters.',
      );
    }

    const limit = this.parseLimit(rawLimit);
    const items = await this.geographyService.search(query, limit);
    return {
      query,
      items,
    };
  }

  private parseLimit(rawLimit: string | undefined): number {
    if (!rawLimit) {
      return 20;
    }

    if (!isPositiveIntegerString(rawLimit)) {
      throw new BadRequestException('Query parameter "limit" must be a numeric value.');
    }

    const parsed = Number.parseInt(rawLimit, 10);
    if (parsed < 1 || parsed > 50) {
      throw new BadRequestException('Query parameter "limit" must be between 1 and 50.');
    }

    return parsed;
  }
}
