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

  describe('batch balances', () => {
    it('aggregates the balance of several supplies in one call', async () => {
      const otherSupplyId = await context.createSupply();
      await repository.save(StockMovement.in(supplyId, 10));
      await repository.save(StockMovement.reserve(supplyId, 4, 'OS-1'));
      await repository.save(StockMovement.in(otherSupplyId, 3));

      const balances = await repository.getAvailableBalances([
        supplyId,
        otherSupplyId,
      ]);

      expect(balances.get(supplyId)).toBe(6);
      expect(balances.get(otherSupplyId)).toBe(3);
    });

    it('maps a supply without movements to zero instead of omitting it', async () => {
      const balances = await repository.getAvailableBalances([supplyId]);

      expect(balances.get(supplyId)).toBe(0);
    });

    it('maps an unknown supply id to zero', async () => {
      const unknownId = randomUUID();

      const balances = await repository.getAvailableBalances([unknownId]);

      expect(balances.get(unknownId)).toBe(0);
    });

    it('returns an empty map for an empty id list', async () => {
      await repository.save(StockMovement.in(supplyId, 10));

      const balances = await repository.getAvailableBalances([]);

      expect(balances.size).toBe(0);
    });

    it('agrees with the single-supply balance query', async () => {
      await repository.save(StockMovement.in(supplyId, 9));
      await repository.save(StockMovement.reserve(supplyId, 2, 'OS-7'));

      const [single, batch] = await Promise.all([
        repository.getAvailableBalance(supplyId),
        repository.getAvailableBalances([supplyId]),
      ]);

      expect(batch.get(supplyId)).toBe(single);
    });
  });
}
