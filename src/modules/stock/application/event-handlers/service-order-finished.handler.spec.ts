import { ServiceOrderFinished } from '../../../service-management/service-orders/domain/events/service-order-finished.event';
import { PartWrittenOffFromStock } from '../../domain/events/part-written-off-from-stock.event';
import {
  MovementType,
  StockMovement,
} from '../../domain/stock-movement.entity';
import { Supply } from '../../domain/supply.entity';
import { InMemoryStockMovementRepository } from '../../__test__/in-memory-stock-movement.repository';
import { InMemorySupplyRepository } from '../../__test__/in-memory-supply.repository';
import { RecordingDomainEventPublisher } from '../../__test__/recording-domain-event.publisher';
import { WriteOffReservedPartUseCase } from '../write-off-reserved-part.usecase';
import { ServiceOrderFinishedHandler } from './service-order-finished.handler';

const TEST_PERFORMER = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Estoquista Teste',
};

const ORDER_ID = '66666666-6666-4666-8666-000000000001';
const OTHER_ORDER_ID = '66666666-6666-4666-8666-000000000002';

describe('ServiceOrderFinishedHandler', () => {
  let supplyRepository: InMemorySupplyRepository;
  let movementRepository: InMemoryStockMovementRepository;
  let publisher: RecordingDomainEventPublisher;
  let handler: ServiceOrderFinishedHandler;

  beforeEach(() => {
    supplyRepository = new InMemorySupplyRepository();
    movementRepository = new InMemoryStockMovementRepository();
    publisher = new RecordingDomainEventPublisher();
    handler = new ServiceOrderFinishedHandler(
      movementRepository,
      new WriteOffReservedPartUseCase(
        supplyRepository,
        movementRepository,
        publisher,
      ),
    );
  });

  const givenReservedFor = async (
    name: string,
    stocked: number,
    reserved: number,
    orderId: string = ORDER_ID,
  ): Promise<string> => {
    const supply = Supply.create({ name, priceInCents: 12000 });
    await supplyRepository.save(supply);
    await movementRepository.save(
      StockMovement.in(supply.id, stocked, TEST_PERFORMER),
    );
    await movementRepository.save(
      StockMovement.reserve(supply.id, reserved, orderId),
    );
    return supply.id;
  };

  const consumedFor = (supplyId: string) =>
    movementRepository.movements.filter(
      (movement) =>
        movement.supplyId === supplyId &&
        movement.type === MovementType.Consume,
    );

  it('writes off everything the order still holds reserved', async () => {
    const oilId = await givenReservedFor('Oleo 5W30', 10, 4);
    const filterId = await givenReservedFor('Filtro de oleo', 10, 1);

    await handler.handle(new ServiceOrderFinished(ORDER_ID));

    await expect(
      movementRepository.getReservedQuantity(oilId, ORDER_ID),
    ).resolves.toBe(0);
    await expect(
      movementRepository.getReservedQuantity(filterId, ORDER_ID),
    ).resolves.toBe(0);
    expect(consumedFor(oilId)[0].quantity).toBe(4);
  });

  // A write-off consumes a reservation; it never credits units back to the
  // shelf. The available balance must not move.
  it('leaves the available balance where the reservation already put it', async () => {
    const oilId = await givenReservedFor('Oleo 5W30', 10, 4);

    await handler.handle(new ServiceOrderFinished(ORDER_ID));

    await expect(movementRepository.getAvailableBalance(oilId)).resolves.toBe(
      6,
    );
  });

  it('publishes PartWrittenOffFromStock for each line', async () => {
    const oilId = await givenReservedFor('Oleo 5W30', 10, 4);

    await handler.handle(new ServiceOrderFinished(ORDER_ID));

    const writtenOff = publisher.events.filter(
      (event): event is PartWrittenOffFromStock =>
        event instanceof PartWrittenOffFromStock,
    );
    expect(writtenOff).toHaveLength(1);
    expect(writtenOff[0]).toMatchObject({
      supplyId: oilId,
      quantity: 4,
      serviceOrderReference: ORDER_ID,
    });
  });

  it('never touches another order reservations', async () => {
    const oilId = await givenReservedFor('Oleo 5W30', 10, 4);
    const otherId = await givenReservedFor('Pastilha', 10, 3, OTHER_ORDER_ID);

    await handler.handle(new ServiceOrderFinished(ORDER_ID));

    expect(consumedFor(oilId)).toHaveLength(1);
    expect(consumedFor(otherId)).toHaveLength(0);
    await expect(
      movementRepository.getReservedQuantity(otherId, OTHER_ORDER_ID),
    ).resolves.toBe(3);
  });

  it('does nothing for an order that reserved no parts', async () => {
    await handler.handle(new ServiceOrderFinished(ORDER_ID));

    expect(movementRepository.movements).toHaveLength(0);
    expect(publisher.events).toHaveLength(0);
  });

  // `emit()` is fire-and-forget, so the same event can reach this handler
  // twice. The second pass must find nothing outstanding and consume nothing.
  it('is idempotent when the event arrives twice', async () => {
    const oilId = await givenReservedFor('Oleo 5W30', 10, 4);

    await handler.handle(new ServiceOrderFinished(ORDER_ID));
    await handler.handle(new ServiceOrderFinished(ORDER_ID));

    expect(consumedFor(oilId)).toHaveLength(1);
    await expect(movementRepository.getAvailableBalance(oilId)).resolves.toBe(
      6,
    );
  });

  // Partially consumed by hand before the order finished: only the remainder
  // is left to write off.
  it('writes off only the units still outstanding', async () => {
    const oilId = await givenReservedFor('Oleo 5W30', 10, 4);
    await movementRepository.save(StockMovement.consume(oilId, 1, ORDER_ID));

    await handler.handle(new ServiceOrderFinished(ORDER_ID));

    expect(consumedFor(oilId).map((movement) => movement.quantity)).toEqual([
      1, 3,
    ]);
    await expect(
      movementRepository.getReservedQuantity(oilId, ORDER_ID),
    ).resolves.toBe(0);
  });

  it('carries on with the other lines when one write-off fails', async () => {
    const oilId = await givenReservedFor('Oleo 5W30', 10, 4);
    const filterId = await givenReservedFor('Filtro de oleo', 10, 1);
    jest
      .spyOn(movementRepository, 'writeOffIfReserved')
      .mockRejectedValueOnce(new Error('ledger unreachable'));

    await expect(
      handler.handle(new ServiceOrderFinished(ORDER_ID)),
    ).resolves.toBeUndefined();

    expect(consumedFor(oilId)).toHaveLength(0);
    expect(consumedFor(filterId)).toHaveLength(1);
  });
});
