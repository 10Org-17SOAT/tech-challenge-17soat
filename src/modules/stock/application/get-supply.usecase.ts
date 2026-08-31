import { Inject, Injectable } from '@nestjs/common';
import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { STOCK_MOVEMENT_REPOSITORY } from '../domain/stock-movement.repository';
import type { StockMovementRepository } from '../domain/stock-movement.repository';
import { SUPPLY_REPOSITORY } from '../domain/supply.repository';
import type { SupplyRepository } from '../domain/supply.repository';
import type { SupplyWithBalance } from './supply-with-balance';

@Injectable()
export class GetSupplyUseCase {
  constructor(
    @Inject(SUPPLY_REPOSITORY)
    private readonly supplyRepository: SupplyRepository,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly stockMovementRepository: StockMovementRepository,
  ) {}

  async execute(id: string): Promise<SupplyWithBalance> {
    const supply = await this.supplyRepository.findById(id);
    if (!supply) {
      throw new SupplyNotFoundError(id);
    }

    const availableBalance =
      await this.stockMovementRepository.getAvailableBalance(supply.id);

    return { supply, availableBalance };
  }
}
