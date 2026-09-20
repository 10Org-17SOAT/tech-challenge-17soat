import { Inject, Injectable } from '@nestjs/common';
import { UnknownStockKeeperError } from '../domain/errors/unknown-stock-keeper.error';
import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { StockMovement } from '../domain/stock-movement.entity';
import { STOCK_MOVEMENT_REPOSITORY } from '../domain/stock-movement.repository';
import type { StockMovementRepository } from '../domain/stock-movement.repository';
import { STOCK_KEEPER_DIRECTORY_QUERY } from '../../stock-keepers/public/stock-keeper-directory.query';
import type { StockKeeperDirectoryQuery } from '../../stock-keepers/public/stock-keeper-directory.query';
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
    // The published contract, not the repository: stock keepers keep their
    // model private, and this only ever needs the name for the ledger snapshot.
    @Inject(STOCK_KEEPER_DIRECTORY_QUERY)
    private readonly stockKeeperDirectory: StockKeeperDirectoryQuery,
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

    const stockKeeper = await this.stockKeeperDirectory.findById(stockKeeperId);
    if (!stockKeeper) {
      throw new UnknownStockKeeperError(stockKeeperId);
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
