import { InsufficientStockError } from '@/modules/stock/domain/errors/insufficient-stock.error';
import { InvalidStockMovementError } from '@/modules/stock/domain/errors/invalid-stock-movement.error';
import { SupplyNotFoundError } from '@/modules/stock/domain/errors/supply-not-found.error';
import { PartReservedForServiceOrder } from '@/modules/stock/domain/events/part-reserved-for-service-order.event';
import {
  MovementType,
  StockMovement,
} from '@/modules/stock/domain/stock-movement.entity';
import { Supply } from '@/modules/stock/domain/supply.entity';
import { InMemoryStockMovementRepository } from '@/modules/stock/__test__/in-memory-stock-movement.repository';
import { InMemorySupplyRepository } from '@/modules/stock/__test__/in-memory-supply.repository';
import { RecordingDomainEventPublisher } from '@/modules/stock/__test__/recording-domain-event.publisher';
import { ReservePartUseCase } from '@/modules/stock/application/reserve-part.usecase';

describe('ReservePartUseCase', () => {
  let supplyRepository: InMemorySupplyRepository;
  let movementRepository: InMemoryStockMovementRepository;
  let publisher: RecordingDomainEventPublisher;
  let useCase: ReservePartUseCase;

  const givenSupplyWithBalance = async (quantity: number): Promise<string> => {
    const supply = Supply.create({ name: 'Amortecedor', priceInCents: 12000 });
    await supplyRepository.save(supply);
    await movementRepository.save(StockMovement.in(supply.id, quantity));
    return supply.id;
  };

  beforeEach(() => {
    supplyRepository = new InMemorySupplyRepository();
    movementRepository = new InMemoryStockMovementRepository();
    publisher = new RecordingDomainEventPublisher();
    useCase = new ReservePartUseCase(
      supplyRepository,
      movementRepository,
      publisher,
    );
  });

  it('reserves a quantity within the available balance, lowering available and raising reserved', async () => {
    const supplyId = await givenSupplyWithBalance(10);

    const result = await useCase.execute({
      supplyId,
      quantity: 6,
      serviceOrderReference: 'OS-1',
    });

    expect(result.movement.type).toBe(MovementType.Reserve);
    expect(result.availableBalance).toBe(4);
    expect(result.reservedQuantity).toBe(6);
  });

  it('rejects a reservation that exceeds the available balance, changing no balance', async () => {
    const supplyId = await givenSupplyWithBalance(5);

    await expect(
      useCase.execute({
        supplyId,
        quantity: 6,
        serviceOrderReference: 'OS-2',
      }),
    ).rejects.toBeInstanceOf(InsufficientStockError);

    await expect(
      movementRepository.getAvailableBalance(supplyId),
    ).resolves.toBe(5);
    expect(publisher.events).toEqual([]);
  });

  it('publishes PartReservedForServiceOrder on a successful reservation', async () => {
    const supplyId = await givenSupplyWithBalance(10);

    await useCase.execute({
      supplyId,
      quantity: 3,
      serviceOrderReference: 'OS-3',
    });

    expect(publisher.events).toHaveLength(1);
    const [event] = publisher.events as [PartReservedForServiceOrder];
    expect(event).toBeInstanceOf(PartReservedForServiceOrder);
    expect(event.supplyId).toBe(supplyId);
    expect(event.quantity).toBe(3);
    expect(event.serviceOrderReference).toBe('OS-3');
  });

  it('rejects a reservation for a supply that does not exist', async () => {
    await expect(
      useCase.execute({
        supplyId: crypto.randomUUID(),
        quantity: 1,
        serviceOrderReference: 'OS-4',
      }),
    ).rejects.toBeInstanceOf(SupplyNotFoundError);

    expect(publisher.events).toEqual([]);
  });

  it('rejects a missing service order reference before touching the ledger', async () => {
    const supplyId = await givenSupplyWithBalance(10);

    await expect(
      useCase.execute({ supplyId, quantity: 1, serviceOrderReference: '' }),
    ).rejects.toBeInstanceOf(InvalidStockMovementError);

    expect(movementRepository.movements).toHaveLength(1); // only the seed IN
  });

  it('under two concurrent reservations for the same supply where only one fits, accepts exactly one and never lets the balance go negative', async () => {
    const supplyId = await givenSupplyWithBalance(10);

    const attempts = await Promise.allSettled([
      useCase.execute({
        supplyId,
        quantity: 7,
        serviceOrderReference: 'OS-A',
      }),
      useCase.execute({
        supplyId,
        quantity: 7,
        serviceOrderReference: 'OS-B',
      }),
    ]);

    const fulfilled = attempts.filter((a) => a.status === 'fulfilled');
    const rejected = attempts.filter((a) => a.status === 'rejected');
    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(1);

    const availableBalance =
      await movementRepository.getAvailableBalance(supplyId);
    expect(availableBalance).toBe(3);
    expect(availableBalance).toBeGreaterThanOrEqual(0);
    expect(publisher.events).toHaveLength(1);
  });
});
