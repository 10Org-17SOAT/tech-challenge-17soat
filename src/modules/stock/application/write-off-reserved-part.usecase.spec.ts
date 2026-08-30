import { ExceedsReservedQuantityError } from '../domain/errors/exceeds-reserved-quantity.error';
import { ReservationNotFoundError } from '../domain/errors/reservation-not-found.error';
import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { PartWrittenOffFromStock } from '../domain/events/part-written-off-from-stock.event';
import { MovementType, StockMovement } from '../domain/stock-movement.entity';
import { Supply } from '../domain/supply.entity';
import { InMemoryStockMovementRepository } from '../__test__/in-memory-stock-movement.repository';
import { InMemorySupplyRepository } from '../__test__/in-memory-supply.repository';
import { RecordingDomainEventPublisher } from '../__test__/recording-domain-event.publisher';
import { WriteOffReservedPartUseCase } from './write-off-reserved-part.usecase';

const TEST_PERFORMER = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Estoquista Teste',
};

describe('WriteOffReservedPartUseCase', () => {
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
    await movementRepository.save(
      StockMovement.in(supply.id, inQuantity, TEST_PERFORMER),
    );
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

  it('writes off a reserved quantity, lowering the reserved quantity by that amount, without changing the available balance', async () => {
    const supplyId = await givenSupplyWithReservation(10, 6, 'OS-1');

    const result = await useCase.execute({
      supplyId,
      quantity: 4,
      serviceOrderReference: 'OS-1',
    });

    expect(result.movement.type).toBe(MovementType.Consume);
    expect(result.reservedQuantity).toBe(2);
    await expect(
      movementRepository.getReservedQuantity(supplyId, 'OS-1'),
    ).resolves.toBe(2);
    await expect(
      movementRepository.getAvailableBalance(supplyId),
    ).resolves.toBe(4);
  });

  it('rejects a write-off greater than what is currently reserved for that supply/service order reference', async () => {
    const supplyId = await givenSupplyWithReservation(10, 4, 'OS-2');

    await expect(
      useCase.execute({
        supplyId,
        quantity: 5,
        serviceOrderReference: 'OS-2',
      }),
    ).rejects.toBeInstanceOf(ExceedsReservedQuantityError);

    await expect(
      movementRepository.getReservedQuantity(supplyId, 'OS-2'),
    ).resolves.toBe(4);
    expect(publisher.events).toEqual([]);
  });

  it('publishes PartWrittenOffFromStock on a successful write-off', async () => {
    const supplyId = await givenSupplyWithReservation(10, 5, 'OS-3');

    await useCase.execute({
      supplyId,
      quantity: 5,
      serviceOrderReference: 'OS-3',
    });

    expect(publisher.events).toHaveLength(1);
    const [event] = publisher.events as [PartWrittenOffFromStock];
    expect(event).toBeInstanceOf(PartWrittenOffFromStock);
    expect(event.supplyId).toBe(supplyId);
    expect(event.quantity).toBe(5);
    expect(event.serviceOrderReference).toBe('OS-3');
  });

  it('rejects a write-off for a supply that does not exist', async () => {
    await expect(
      useCase.execute({
        supplyId: crypto.randomUUID(),
        quantity: 1,
        serviceOrderReference: 'OS-4',
      }),
    ).rejects.toBeInstanceOf(SupplyNotFoundError);

    expect(publisher.events).toEqual([]);
  });

  it('rejects a write-off referencing a service order/reservation with no matching reservation', async () => {
    const supplyId = await givenSupplyWithReservation(10, 5, 'OS-5');

    await expect(
      useCase.execute({
        supplyId,
        quantity: 1,
        serviceOrderReference: 'OS-does-not-exist',
      }),
    ).rejects.toBeInstanceOf(ReservationNotFoundError);

    expect(publisher.events).toEqual([]);
  });
});
