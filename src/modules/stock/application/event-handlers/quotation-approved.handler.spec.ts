import { randomUUID } from 'node:crypto';
import { QuotationApproved } from '../../../service-management/quotations/domain/events/quotation-approved.event';
import { PartReservedForServiceOrder } from '../../domain/events/part-reserved-for-service-order.event';
import { PurchaseRequestNeeded } from '../../domain/events/purchase-request-needed.event';
import {
  MovementType,
  StockMovement,
} from '../../domain/stock-movement.entity';
import { Supply } from '../../domain/supply.entity';
import { InMemoryStockMovementRepository } from '../../__test__/in-memory-stock-movement.repository';
import { InMemorySupplyRepository } from '../../__test__/in-memory-supply.repository';
import { RecordingDomainEventPublisher } from '../../__test__/recording-domain-event.publisher';
import { ReservePartUseCase } from '../reserve-part.usecase';
import { QuotationApprovedHandler } from './quotation-approved.handler';

const TEST_PERFORMER = {
  id: '11111111-1111-1111-1111-111111111111',
  name: 'Estoquista Teste',
};

const QUOTATION_ID = '55555555-5555-4555-8555-000000000001';
const ORDER_ID = '66666666-6666-4666-8666-000000000001';

describe('QuotationApprovedHandler', () => {
  let supplyRepository: InMemorySupplyRepository;
  let movementRepository: InMemoryStockMovementRepository;
  let publisher: RecordingDomainEventPublisher;
  let handler: QuotationApprovedHandler;

  beforeEach(() => {
    supplyRepository = new InMemorySupplyRepository();
    movementRepository = new InMemoryStockMovementRepository();
    publisher = new RecordingDomainEventPublisher();
    handler = new QuotationApprovedHandler(
      new ReservePartUseCase(supplyRepository, movementRepository, publisher),
      publisher,
    );
  });

  const givenSupplyWithBalance = async (
    name: string,
    quantity: number,
  ): Promise<string> => {
    const supply = Supply.create({ name, priceInCents: 12000 });
    await supplyRepository.save(supply);
    if (quantity > 0) {
      await movementRepository.save(
        StockMovement.in(supply.id, quantity, TEST_PERFORMER),
      );
    }
    return supply.id;
  };

  const approved = (parts: { supplyId: string; quantity: number }[]) =>
    new QuotationApproved(QUOTATION_ID, ORDER_ID, parts);

  const reservationsFor = (supplyId: string) =>
    movementRepository.movements.filter(
      (movement) =>
        movement.supplyId === supplyId &&
        movement.type === MovementType.Reserve,
    );

  it('reserves every part line against the service order', async () => {
    const oilId = await givenSupplyWithBalance('Oleo 5W30', 10);
    const filterId = await givenSupplyWithBalance('Filtro de oleo', 10);

    await handler.handle(
      approved([
        { supplyId: oilId, quantity: 4 },
        { supplyId: filterId, quantity: 1 },
      ]),
    );

    await expect(
      movementRepository.getReservedQuantity(oilId, ORDER_ID),
    ).resolves.toBe(4);
    await expect(
      movementRepository.getReservedQuantity(filterId, ORDER_ID),
    ).resolves.toBe(1);
  });

  // The reservation has to be findable by the order later, or the write-off
  // on `finished` would have nothing to match against.
  it('stamps the service order id as the movement reference', async () => {
    const oilId = await givenSupplyWithBalance('Oleo 5W30', 10);

    await handler.handle(approved([{ supplyId: oilId, quantity: 2 }]));

    expect(reservationsFor(oilId)[0].serviceOrderReference).toBe(ORDER_ID);
  });

  it('lowers the available balance by what it reserved', async () => {
    const oilId = await givenSupplyWithBalance('Oleo 5W30', 10);

    await handler.handle(approved([{ supplyId: oilId, quantity: 4 }]));

    await expect(movementRepository.getAvailableBalance(oilId)).resolves.toBe(
      6,
    );
  });

  it('publishes PartReservedForServiceOrder for each line it reserved', async () => {
    const oilId = await givenSupplyWithBalance('Oleo 5W30', 10);
    const filterId = await givenSupplyWithBalance('Filtro de oleo', 10);

    await handler.handle(
      approved([
        { supplyId: oilId, quantity: 4 },
        { supplyId: filterId, quantity: 1 },
      ]),
    );

    const reserved = publisher.events.filter(
      (event): event is PartReservedForServiceOrder =>
        event instanceof PartReservedForServiceOrder,
    );
    expect(reserved).toHaveLength(2);
    expect(reserved.map((event) => event.supplyId)).toEqual([oilId, filterId]);
  });

  it('does nothing for a quotation with no part lines', async () => {
    await handler.handle(approved([]));

    expect(movementRepository.movements).toHaveLength(0);
    expect(publisher.events).toHaveLength(0);
  });

  describe('when a line cannot be reserved', () => {
    // The point of the tolerance: one part short must not leave the rest of
    // an approved order unreserved. The order has already advanced by now.
    it('still reserves the other lines', async () => {
      const shortId = await givenSupplyWithBalance('Correia', 1);
      const oilId = await givenSupplyWithBalance('Oleo 5W30', 10);

      await handler.handle(
        approved([
          { supplyId: shortId, quantity: 5 },
          { supplyId: oilId, quantity: 4 },
        ]),
      );

      expect(reservationsFor(shortId)).toHaveLength(0);
      await expect(
        movementRepository.getReservedQuantity(oilId, ORDER_ID),
      ).resolves.toBe(4);
    });

    it('asks for a purchase when the stock is insufficient', async () => {
      const shortId = await givenSupplyWithBalance('Correia', 1);

      await handler.handle(approved([{ supplyId: shortId, quantity: 5 }]));

      const requests = publisher.events.filter(
        (event): event is PurchaseRequestNeeded =>
          event instanceof PurchaseRequestNeeded,
      );
      expect(requests).toHaveLength(1);
      expect(requests[0].supplyId).toBe(shortId);
    });

    it('skips a supply that no longer exists without asking for a purchase', async () => {
      const goneId = randomUUID();
      const oilId = await givenSupplyWithBalance('Oleo 5W30', 10);

      await handler.handle(
        approved([
          { supplyId: goneId, quantity: 1 },
          { supplyId: oilId, quantity: 2 },
        ]),
      );

      expect(
        publisher.events.filter(
          (event) => event instanceof PurchaseRequestNeeded,
        ),
      ).toHaveLength(0);
      await expect(
        movementRepository.getReservedQuantity(oilId, ORDER_ID),
      ).resolves.toBe(2);
    });

    it('does not swallow an unexpected failure', async () => {
      const oilId = await givenSupplyWithBalance('Oleo 5W30', 10);
      const boom = new Error('ledger unreachable');
      jest
        .spyOn(movementRepository, 'reserveIfAvailable')
        .mockRejectedValueOnce(boom);

      await expect(
        handler.handle(approved([{ supplyId: oilId, quantity: 1 }])),
      ).rejects.toThrow(boom);
    });
  });
});
