import { Inject, Injectable } from '@nestjs/common';
import { StockKeeperNotFoundError } from '../domain/errors/stock-keeper-not-found.error';
import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { StockMovement } from '../domain/stock-movement.entity';
import { STOCK_MOVEMENT_REPOSITORY } from '../domain/stock-movement.repository';
import type { StockMovementRepository } from '../domain/stock-movement.repository';
import { STOCK_KEEPER_REPOSITORY } from '../domain/stock-keeper.repository';
import type { StockKeeperRepository } from '../domain/stock-keeper.repository';
import { SUPPLY_REPOSITORY } from '../domain/supply.repository';
import type { SupplyRepository } from '../domain/supply.repository';

export interface RegisterStockEntryInput {
  supplyId: string;
  quantity: number;
  stockKeeperId: string;
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
    @Inject(STOCK_KEEPER_REPOSITORY)
    private readonly stockKeeperRepository: StockKeeperRepository,
  ) {}

  async execute({
    supplyId,
    quantity,
    stockKeeperId,
  }: RegisterStockEntryInput): Promise<RegisterStockEntryOutput> {
    const supply = await this.supplyRepository.findById(supplyId);
    if (!supply) {
      throw new SupplyNotFoundError(supplyId);
    }

    const stockKeeper =
      await this.stockKeeperRepository.findById(stockKeeperId);
    if (!stockKeeper) {
      throw new StockKeeperNotFoundError(stockKeeperId);
    }

    const movement = StockMovement.in(supply.id, quantity, {
      id: stockKeeper.id,
      name: stockKeeper.name,
    });
    await this.stockMovementRepository.save(movement);

    const availableBalance =
      await this.stockMovementRepository.getAvailableBalance(supply.id);

    return { movement, availableBalance };
  }
}
