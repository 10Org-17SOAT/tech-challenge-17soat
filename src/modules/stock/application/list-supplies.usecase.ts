import { Inject, Injectable } from '@nestjs/common';
import { Supply } from '../domain/supply.entity';
import { SUPPLY_REPOSITORY } from '../domain/supply.repository';
import type {
  ListSuppliesFilter,
  SupplyRepository,
} from '../domain/supply.repository';

export interface ListSuppliesOutput {
  items: Supply[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ListSuppliesUseCase {
  constructor(
    @Inject(SUPPLY_REPOSITORY)
    private readonly supplyRepository: SupplyRepository,
  ) {}

  async execute(filter: ListSuppliesFilter): Promise<ListSuppliesOutput> {
    const { items, total } = await this.supplyRepository.findMany(filter);
    return { items, total, page: filter.page, limit: filter.limit };
  }
}
