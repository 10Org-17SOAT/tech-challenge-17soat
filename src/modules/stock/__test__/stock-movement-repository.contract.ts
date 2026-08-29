import { randomUUID } from 'node:crypto';
import { ExceedsReservedQuantityError } from '@/modules/stock/domain/errors/exceeds-reserved-quantity.error';
import { InsufficientStockError } from '@/modules/stock/domain/errors/insufficient-stock.error';
import { ReservationNotFoundError } from '@/modules/stock/domain/errors/reservation-not-found.error';
import { StockMovement } from '@/modules/stock/domain/stock-movement.entity';
import type { StockMovementRepository } from '@/modules/stock/domain/stock-movement.repository';

export interface StockMovementRepositoryContext {
  repository: StockMovementRepository;
  /** Registers a supply the movements may reference, returning its id. */
  createSupply: () => Promise<string>;
}

/**
 * Behaviour every StockMovementRepository must satisfy, whatever the storage.
 * Shared by the in-memory fake (unit) and the Drizzle adapter (e2e) so the fake
 * can never drift from the real balance arithmetic — stock integrity is
 * critical.
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

  it('scopes the reserved quantity to a single service order reference when given', async () => {
    await repository.save(StockMovement.in(supplyId, 10));
    await repository.save(StockMovement.reserve(supplyId, 4, 'OS-1'));
    await repository.save(StockMovement.reserve(supplyId, 3, 'OS-2'));
    await repository.save(StockMovement.consume(supplyId, 1, 'OS-1'));

    await expect(
      repository.getReservedQuantity(supplyId, 'OS-1'),
    ).resolves.toBe(3);
    await expect(
      repository.getReservedQuantity(supplyId, 'OS-2'),
    ).resolves.toBe(3);
    await expect(
      repository.getReservedQuantity(supplyId, 'OS-none'),
    ).resolves.toBe(0);
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

    it('reserveIfAvailable does not disappear from the batch balance', async () => {
      await repository.save(StockMovement.in(supplyId, 10));
      await repository.reserveIfAvailable(
        StockMovement.reserve(supplyId, 4, 'OS-batch'),
      );

      const balances = await repository.getAvailableBalances([supplyId]);

      expect(balances.get(supplyId)).toBe(6);
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

  describe('reserveIfAvailable', () => {
    it('reserves a quantity within the available balance, lowering available and raising reserved', async () => {
      await repository.save(StockMovement.in(supplyId, 10));

      await repository.reserveIfAvailable(
        StockMovement.reserve(supplyId, 6, 'OS-1'),
      );

      await expect(repository.getAvailableBalance(supplyId)).resolves.toBe(4);
      await expect(repository.getReservedQuantity(supplyId)).resolves.toBe(6);
    });

    it('rejects a reservation that exceeds the available balance, changing no balance', async () => {
      await repository.save(StockMovement.in(supplyId, 5));

      await expect(
        repository.reserveIfAvailable(
          StockMovement.reserve(supplyId, 6, 'OS-2'),
        ),
      ).rejects.toBeInstanceOf(InsufficientStockError);

      await expect(repository.getAvailableBalance(supplyId)).resolves.toBe(5);
      await expect(repository.getReservedQuantity(supplyId)).resolves.toBe(0);
    });

    it('rejects a reservation against a supply with no movements at all', async () => {
      await expect(
        repository.reserveIfAvailable(
          StockMovement.reserve(supplyId, 1, 'OS-3'),
        ),
      ).rejects.toBeInstanceOf(InsufficientStockError);
    });

    // The technical risk #1 flagged by the product doc: two reservations
    // racing the same supply where only one fits must never both succeed —
    // a plain check-then-insert passes a single-process test and fails here.
    it('accepts exactly one of two concurrent reservations where only one fits, and the available balance never goes negative', async () => {
      await repository.save(StockMovement.in(supplyId, 10));

      const attempts = await Promise.allSettled([
        repository.reserveIfAvailable(
          StockMovement.reserve(supplyId, 7, 'OS-A'),
        ),
        repository.reserveIfAvailable(
          StockMovement.reserve(supplyId, 7, 'OS-B'),
        ),
      ]);

      const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
      const rejected = attempts.filter((a) => a.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(InsufficientStockError);

      const availableBalance = await repository.getAvailableBalance(supplyId);
      expect(availableBalance).toBe(3);
      expect(availableBalance).toBeGreaterThanOrEqual(0);
    });
  });

  describe('writeOffIfReserved', () => {
    it('writes off a quantity within what is reserved, lowering the reserved quantity by that amount', async () => {
      await repository.save(StockMovement.in(supplyId, 10));
      await repository.save(StockMovement.reserve(supplyId, 6, 'OS-1'));

      await repository.writeOffIfReserved(
        StockMovement.consume(supplyId, 4, 'OS-1'),
      );

      await expect(
        repository.getReservedQuantity(supplyId, 'OS-1'),
      ).resolves.toBe(2);
      await expect(repository.getAvailableBalance(supplyId)).resolves.toBe(4);
    });

    it('rejects a write-off that exceeds the reserved quantity, changing no balance', async () => {
      await repository.save(StockMovement.in(supplyId, 10));
      await repository.save(StockMovement.reserve(supplyId, 4, 'OS-2'));

      await expect(
        repository.writeOffIfReserved(
          StockMovement.consume(supplyId, 5, 'OS-2'),
        ),
      ).rejects.toBeInstanceOf(ExceedsReservedQuantityError);

      await expect(
        repository.getReservedQuantity(supplyId, 'OS-2'),
      ).resolves.toBe(4);
    });

    it('rejects a write-off against a reference with no reservation at all', async () => {
      await repository.save(StockMovement.in(supplyId, 10));

      await expect(
        repository.writeOffIfReserved(
          StockMovement.consume(supplyId, 1, 'OS-none'),
        ),
      ).rejects.toBeInstanceOf(ReservationNotFoundError);
    });

    it('accepts exactly one of two concurrent write-offs where only one fits, and the reserved quantity never goes negative', async () => {
      await repository.save(StockMovement.in(supplyId, 10));
      await repository.save(StockMovement.reserve(supplyId, 10, 'OS-race'));

      const attempts = await Promise.allSettled([
        repository.writeOffIfReserved(
          StockMovement.consume(supplyId, 7, 'OS-race'),
        ),
        repository.writeOffIfReserved(
          StockMovement.consume(supplyId, 7, 'OS-race'),
        ),
      ]);

      const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
      const rejected = attempts.filter((a) => a.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);
      expect(rejected[0].reason).toBeInstanceOf(ExceedsReservedQuantityError);

      const reservedQuantity = await repository.getReservedQuantity(
        supplyId,
        'OS-race',
      );
      expect(reservedQuantity).toBe(3);
      expect(reservedQuantity).toBeGreaterThanOrEqual(0);
    });
  });
}
