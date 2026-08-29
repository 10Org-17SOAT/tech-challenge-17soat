import { ReservationNotFoundError } from '@/modules/stock/domain/errors/reservation-not-found.error';
import { StockMovement } from '@/modules/stock/domain/stock-movement.entity';
import { Supply } from '@/modules/stock/domain/supply.entity';
import { InMemoryStockMovementRepository } from '@/modules/stock/__test__/in-memory-stock-movement.repository';
import { InMemorySupplyRepository } from '@/modules/stock/__test__/in-memory-supply.repository';
import { RecordingDomainEventPublisher } from '@/modules/stock/__test__/recording-domain-event.publisher';
import { WriteOffReservedPartUseCase } from '@/modules/stock/application/write-off-reserved-part.usecase';

describe('WriteOffReservedPartUseCase chaos', () => {
  let supplyRepository: InMemorySupplyRepository;
  let movementRepository: InMemoryStockMovementRepository;
  let publisher: RecordingDomainEventPublisher;
  let useCase: WriteOffReservedPartUseCase;

  const givenSupplyWithReservation = async (
    inQuantity: number,
    reservedQuantity: number,
    serviceOrderReference: string,
  ): Promise<string> => {
    const supply = Supply.create({ name: 'Amortecedor', priceInCents: 12000 });
    await supplyRepository.save(supply);
    await movementRepository.save(StockMovement.in(supply.id, inQuantity));
    await movementRepository.save(
      StockMovement.reserve(supply.id, reservedQuantity, serviceOrderReference),
    );
    return supply.id;
  };

  beforeEach(() => {
    supplyRepository = new InMemorySupplyRepository();
    movementRepository = new InMemoryStockMovementRepository();
    publisher = new RecordingDomainEventPublisher();
    useCase = new WriteOffReservedPartUseCase(
      supplyRepository,
      movementRepository,
      publisher,
    );
  });

  describe('concurrency: two write-offs racing the same reservation', () => {
    it('never lets the sum of concurrent write-offs exceed what was reserved', async () => {
      const supplyId = await givenSupplyWithReservation(10, 10, 'OS-race');

      const attempts = await Promise.allSettled([
        useCase.execute({
          supplyId,
          quantity: 7,
          serviceOrderReference: 'OS-race',
        }),
        useCase.execute({
          supplyId,
          quantity: 7,
          serviceOrderReference: 'OS-race',
        }),
      ]);

      const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
      const rejected = attempts.filter((a) => a.status === 'rejected');
      expect(fulfilled).toHaveLength(1);
      expect(rejected).toHaveLength(1);

      const reservedQuantity = await movementRepository.getReservedQuantity(
        supplyId,
        'OS-race',
      );
      expect(reservedQuantity).toBe(3);
      expect(reservedQuantity).toBeGreaterThanOrEqual(0);
    });
  });

  describe('boundary: draining a reservation to exactly zero', () => {
    it('accepts a write-off equal to the full reserved amount, then rejects a further one against the drained reference', async () => {
      const supplyId = await givenSupplyWithReservation(10, 5, 'OS-drain');

      const result = await useCase.execute({
        supplyId,
        quantity: 5,
        serviceOrderReference: 'OS-drain',
      });
      expect(result.reservedQuantity).toBe(0);

      await expect(
        useCase.execute({
          supplyId,
          quantity: 1,
          serviceOrderReference: 'OS-drain',
        }),
      ).rejects.toBeInstanceOf(ReservationNotFoundError);
    });
  });

  describe('boundary: sequential partial write-offs summing to the exact reservation', () => {
    it('accepts every partial write-off and lands exactly at zero reserved', async () => {
      const supplyId = await givenSupplyWithReservation(10, 10, 'OS-partial');

      await useCase.execute({
        supplyId,
        quantity: 4,
        serviceOrderReference: 'OS-partial',
      });
      await useCase.execute({
        supplyId,
        quantity: 3,
        serviceOrderReference: 'OS-partial',
      });
      const last = await useCase.execute({
        supplyId,
        quantity: 3,
        serviceOrderReference: 'OS-partial',
      });

      expect(last.reservedQuantity).toBe(0);
      await expect(
        movementRepository.getAvailableBalance(supplyId),
      ).resolves.toBe(0);
    });
  });

  describe('state: reference whose reservation is already fully consumed', () => {
    it('rejects a write-off the same way as an unknown reference, not with a distinct error', async () => {
      const supplyId = await givenSupplyWithReservation(10, 5, 'OS-exhausted');
      await useCase.execute({
        supplyId,
        quantity: 5,
        serviceOrderReference: 'OS-exhausted',
      });

      await expect(
        useCase.execute({
          supplyId,
          quantity: 1,
          serviceOrderReference: 'OS-exhausted',
        }),
      ).rejects.toBeInstanceOf(ReservationNotFoundError);
    });
  });
});
