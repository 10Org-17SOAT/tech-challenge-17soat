import { Inject, Injectable } from '@nestjs/common';
import { SupplyNotFoundError } from '@/modules/stock/domain/errors/supply-not-found.error';
import { StockMovement } from '@/modules/stock/domain/stock-movement.entity';
import { STOCK_MOVEMENT_REPOSITORY } from '@/modules/stock/domain/stock-movement.repository';
import type { StockMovementRepository } from '@/modules/stock/domain/stock-movement.repository';
import { SUPPLY_REPOSITORY } from '@/modules/stock/domain/supply.repository';
import type { SupplyRepository } from '@/modules/stock/domain/supply.repository';

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
