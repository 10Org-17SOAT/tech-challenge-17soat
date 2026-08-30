import { Inject, Injectable } from '@nestjs/common';
import { SUPPLY_CATALOG_QUERY } from '../../../stock/public/supply-catalog.query';
import type { SupplyCatalogQuery } from '../../../stock/public/supply-catalog.query';
import type { PartCatalog, PartView } from '../domain/part-catalog.port';

/**
 * The single seam between service-management and stock. It imports only
 * stock's published contract (`stock/public`), never its domain, use cases or
 * repositories — and the dependency points one way: the workshop consumes
 * parts, stock never learns that service orders exist.
 */
@Injectable()
export class StockPartCatalog implements PartCatalog {
  constructor(
    @Inject(SUPPLY_CATALOG_QUERY)
    private readonly supplyCatalog: SupplyCatalogQuery,
  ) {}

  async findManyByIds(ids: string[]): Promise<Map<string, PartView>> {
    const supplies = await this.supplyCatalog.findManyByIds(ids);
    return new Map(
      [...supplies.values()].map((supply) => [
        supply.id,
        { id: supply.id, name: supply.name, priceInCents: supply.priceInCents },
      ]),
    );
  }
}
