import { InsufficientStockError } from '../domain/errors/insufficient-stock.error';
import { MovementType, StockMovement } from '../domain/stock-movement.entity';
import type { StockMovementRepository } from '../domain/stock-movement.repository';

export class InMemoryStockMovementRepository implements StockMovementRepository {
  readonly movements: StockMovement[] = [];

  save(movement: StockMovement): Promise<void> {
    this.movements.push(movement);
    return Promise.resolve();
  }

  // No `await` between the balance read and the push: the whole check runs
  // in one microtask, so two Promise.all'd calls can never interleave — the
  // same guarantee the Drizzle adapter gets from a row lock.
  reserveIfAvailable(movement: StockMovement): Promise<void> {
    const availableBalance = this.sumSignedSync(
      movement.supplyId,
      MovementType.In,
      MovementType.Reserve,
    );
    if (availableBalance < movement.quantity) {
      return Promise.reject(
        new InsufficientStockError(
          movement.supplyId,
          movement.quantity,
          availableBalance,
        ),
      );
    }
    this.movements.push(movement);
    return Promise.resolve();
  }

  getAvailableBalance(supplyId: string): Promise<number> {
    return this.sumSignedBy(supplyId, MovementType.In, MovementType.Reserve);
  }

  async getAvailableBalances(
    supplyIds: string[],
  ): Promise<Map<string, number>> {
    const balances = new Map<string, number>();
    for (const supplyId of supplyIds) {
      balances.set(supplyId, await this.getAvailableBalance(supplyId));
    }
    return balances;
  }

  getReservedQuantity(supplyId: string): Promise<number> {
    return this.sumSignedBy(
      supplyId,
      MovementType.Reserve,
      MovementType.Consume,
    );
  }

  private sumSignedBy(
    supplyId: string,
    credit: MovementType,
    debit: MovementType,
  ): Promise<number> {
    return Promise.resolve(this.sumSignedSync(supplyId, credit, debit));
  }

  private sumSignedSync(
    supplyId: string,
    credit: MovementType,
    debit: MovementType,
  ): number {
    return this.movements
      .filter((movement) => movement.supplyId === supplyId)
      .reduce((sum, movement) => {
        if (movement.type === credit) return sum + movement.quantity;
        if (movement.type === debit) return sum - movement.quantity;
        return sum;
      }, 0);
  }
}
