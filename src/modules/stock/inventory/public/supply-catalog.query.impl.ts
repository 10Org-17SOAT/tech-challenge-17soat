import { Inject, Injectable } from '@nestjs/common';
import { SUPPLY_REPOSITORY } from '../domain/supply.repository';
import type { SupplyRepository } from '../domain/supply.repository';
import type { SupplyCatalogQuery, SupplyView } from './supply-catalog.query';

@Injectable()
export class SupplyCatalogQueryImpl implements SupplyCatalogQuery {
  constructor(
    @Inject(SUPPLY_REPOSITORY)
    private readonly supplyRepository: SupplyRepository,
  ) {}

  async findManyByIds(ids: string[]): Promise<Map<string, SupplyView>> {
    if (ids.length === 0) return new Map();

    const supplies = await this.supplyRepository.findManyByIds(ids);
    return new Map(
      supplies.map((supply) => [
        supply.id,
        { id: supply.id, name: supply.name, priceInCents: supply.priceInCents },
      ]),
    );
  }
}
