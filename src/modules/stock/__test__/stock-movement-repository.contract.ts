import { randomUUID } from 'node:crypto';
import { StockMovement } from '../domain/stock-movement.entity';
import type { StockMovementRepository } from '../domain/stock-movement.repository';

export interface StockMovementRepositoryContext {
  repository: StockMovementRepository;
  /** Registers a supply the movements may reference, returning its id. */
  createSupply: () => Promise<string>;
}

/**
 * Behaviour every StockMovementRepository must satisfy, whatever the storage.
 * Shared by the in-memory fake (unit) and the Drizzle adapter (e2e) so the fake
 * can never drift from the real balance arithmetic — stock integrity is
 * critical (GUIDELINES.md § Domain criticality).
 */
export function describeStockMovementRepositoryContract(
  makeContext: () => Promise<StockMovementRepositoryContext>,
): void {
  let context: StockMovementRepositoryContext;
  let repository: StockMovementRepository;
  let supplyId: string;

  beforeEach(async () => {
    context = await makeContext();
    repository = context.repository;
    supplyId = await context.createSupply();
  });

  it('returns a zero balance for a supply without movements', async () => {
    await expect(repository.getAvailableBalance(supplyId)).resolves.toBe(0);
  });

  it('returns a zero reserved quantity for a supply without movements', async () => {
    await expect(repository.getReservedQuantity(supplyId)).resolves.toBe(0);
  });

  it('computes the available balance as SUM(IN) - SUM(RESERVE)', async () => {
    await repository.save(StockMovement.in(supplyId, 10));
    await repository.save(StockMovement.in(supplyId, 5));
    await repository.save(StockMovement.reserve(supplyId, 4, 'OS-1'));

    await expect(repository.getAvailableBalance(supplyId)).resolves.toBe(11);
  });

  it('does not credit the available balance back when a reservation is consumed', async () => {
    await repository.save(StockMovement.in(supplyId, 10));
    await repository.save(StockMovement.reserve(supplyId, 4, 'OS-1'));
    await repository.save(StockMovement.consume(supplyId, 4, 'OS-1'));

    await expect(repository.getAvailableBalance(supplyId)).resolves.toBe(6);
  });

  it('computes the reserved quantity as SUM(RESERVE) - SUM(CONSUME)', async () => {
    await repository.save(StockMovement.in(supplyId, 10));
    await repository.save(StockMovement.reserve(supplyId, 4, 'OS-1'));
    await repository.save(StockMovement.reserve(supplyId, 3, 'OS-2'));
    await repository.save(StockMovement.consume(supplyId, 4, 'OS-1'));

    await expect(repository.getReservedQuantity(supplyId)).resolves.toBe(3);
  });

  it('keeps the balances of different supplies isolated', async () => {
    const otherSupplyId = await context.createSupply();
    await repository.save(StockMovement.in(supplyId, 10));

    await expect(repository.getAvailableBalance(otherSupplyId)).resolves.toBe(
      0,
    );
  });

  it('returns a zero balance for a supply id that has never been seen', async () => {
    await expect(repository.getAvailableBalance(randomUUID())).resolves.toBe(0);
  });
}
