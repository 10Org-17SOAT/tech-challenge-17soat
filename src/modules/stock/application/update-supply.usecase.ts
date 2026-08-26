import { Inject, Injectable } from '@nestjs/common';
import { SupplyNameAlreadyExistsError } from '../domain/errors/supply-name-already-exists.error';
import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { STOCK_MOVEMENT_REPOSITORY } from '../domain/stock-movement.repository';
import type { StockMovementRepository } from '../domain/stock-movement.repository';
import { SUPPLY_REPOSITORY } from '../domain/supply.repository';
import type { SupplyRepository } from '../domain/supply.repository';
import type { SupplyWithBalance } from './supply-with-balance';

export interface UpdateSupplyInput {
  name?: string;
  description?: string | null;
  priceInCents?: number;
}

@Injectable()
export class UpdateSupplyUseCase {
  constructor(
    @Inject(SUPPLY_REPOSITORY)
    private readonly supplyRepository: SupplyRepository,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly stockMovementRepository: StockMovementRepository,
  ) {}

  async execute(
    id: string,
    input: UpdateSupplyInput,
  ): Promise<SupplyWithBalance> {
    const supply = await this.supplyRepository.findById(id);
    if (!supply) {
      throw new SupplyNotFoundError(id);
    }

    supply.update(input);

    if (input.name !== undefined) {
      const existing = await this.supplyRepository.findByName(supply.name);
      if (existing && existing.id !== supply.id) {
        throw new SupplyNameAlreadyExistsError(supply.name);
      }
    }

    await this.supplyRepository.save(supply);

    const availableBalance =
      await this.stockMovementRepository.getAvailableBalance(supply.id);

    return { supply, availableBalance };
  }
}
