import { Inject, Injectable } from '@nestjs/common';
import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { StockMovement } from '../domain/stock-movement.entity';
import { STOCK_MOVEMENT_REPOSITORY } from '../domain/stock-movement.repository';
import type { StockMovementRepository } from '../domain/stock-movement.repository';
import { SUPPLY_REPOSITORY } from '../domain/supply.repository';
import type { SupplyRepository } from '../domain/supply.repository';

export interface RegisterStockEntryInput {
  supplyId: string;
  quantity: number;
}

export interface RegisterStockEntryOutput {
  movement: StockMovement;
  availableBalance: number;
}

@Injectable()
export class RegisterStockEntryUseCase {
  constructor(
    @Inject(SUPPLY_REPOSITORY)
    private readonly supplyRepository: SupplyRepository,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly stockMovementRepository: StockMovementRepository,
  ) {}

  async execute({
    supplyId,
    quantity,
  }: RegisterStockEntryInput): Promise<RegisterStockEntryOutput> {
    const supply = await this.supplyRepository.findById(supplyId);
    if (!supply) {
      throw new SupplyNotFoundError(supplyId);
    }

    const movement = StockMovement.in(supply.id, quantity);
    await this.stockMovementRepository.save(movement);

    const availableBalance =
      await this.stockMovementRepository.getAvailableBalance(supply.id);

    return { movement, availableBalance };
  }
}
