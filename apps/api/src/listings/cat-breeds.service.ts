import { Inject, Injectable } from '@nestjs/common';
import { ListingsRepository } from './listings.repository';
import type { CatBreedRecord } from './models/cat-breed.model';

@Injectable()
export class CatBreedsService {
  constructor(
    @Inject(ListingsRepository)
    private readonly listingsRepository: ListingsRepository,
  ) {}

  async listPublicBreeds(): Promise<CatBreedRecord[]> {
    return this.listingsRepository.listCatBreeds();
  }
}
