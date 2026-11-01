import { randomUUID } from 'node:crypto';
import {
  ServiceOrder,
  ServiceOrderStatus,
} from '../domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { ListServiceOrdersUseCase } from './list-service-orders.usecase';

// Orders always reference a vehicle; which one is irrelevant here.
const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';
const OPENED_BY_ID = '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b';
const OPENED_BY_NAME = 'Consultant Fixture';

// The listing only reads status and createdAt, so the order is restored
// straight into the wanted state instead of walking the whole lifecycle.
function orderIn(status: ServiceOrderStatus, createdAt: Date): ServiceOrder {
  return ServiceOrder.restore({
    id: randomUUID(),
    vehicleId: VEHICLE_ID,
    openedById: OPENED_BY_ID,
    openedByName: OPENED_BY_NAME,
    status,
    approvedByCustomer: false,
    notes: null,
    vehicleMileageAtEntry: null,
    scheduledAt: null,
    startedAt: null,
    completedAt: null,
    deliveredAt: null,
    createdAt,
    updatedAt: createdAt,
    deletedAt: null,
  });
}

describe('ListServiceOrdersUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let useCase: ListServiceOrdersUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    useCase = new ListServiceOrdersUseCase(repository);
  });

  it('paginates and reports total', async () => {
    for (let i = 0; i < 5; i++) {
      await repository.save(
        ServiceOrder.create({
          vehicleId: VEHICLE_ID,
          openedById: OPENED_BY_ID,
          openedByName: OPENED_BY_NAME,
        }),
      );
    }

    const first = await useCase.execute({ page: 1, limit: 2 });
    expect(first.items).toHaveLength(2);
    expect(first.total).toBe(5);
    expect(first.page).toBe(1);
    expect(first.limit).toBe(2);

    const third = await useCase.execute({ page: 3, limit: 2 });
    expect(third.items).toHaveLength(1);
  });

  it('filters by status', async () => {
    const a = ServiceOrder.create({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      openedByName: OPENED_BY_NAME,
    });
    const b = ServiceOrder.create({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      openedByName: OPENED_BY_NAME,
    });
    b.transitionTo('in_diagnosis');
    await repository.save(a);
    await repository.save(b);

    const inDiagnosis = await useCase.execute({
      page: 1,
      limit: 10,
      status: 'in_diagnosis',
    });
    expect(inDiagnosis.items).toEqual([b]);
    expect(inDiagnosis.total).toBe(1);
  });

  it('excludes soft-deleted orders', async () => {
    const order = ServiceOrder.create({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      openedByName: OPENED_BY_NAME,
    });
    await repository.save(order);
    order.delete();
    await repository.save(order);

    const result = await useCase.execute({ page: 1, limit: 10 });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });

  it('orders by status priority, oldest first within a status', async () => {
    const older = new Date('2026-01-01T10:00:00Z');
    const newer = new Date('2026-01-02T10:00:00Z');
    const orders = [
      orderIn('received', older),
      orderIn('in_execution', newer),
      orderIn('in_diagnosis', older),
      orderIn('awaiting_execution', older),
      orderIn('in_execution', older),
      orderIn('awaiting_approval', older),
      orderIn('received', newer),
    ];
    for (const order of orders) await repository.save(order);

    const result = await useCase.execute({ page: 1, limit: 10 });

    expect(result.items.map((o) => [o.status, o.createdAt])).toEqual([
      ['in_execution', older],
      ['in_execution', newer],
      ['awaiting_execution', older],
      ['awaiting_approval', older],
      ['in_diagnosis', older],
      ['received', older],
      ['received', newer],
    ]);
  });

  it('leaves finished and delivered out of the default listing', async () => {
    const now = new Date();
    await repository.save(orderIn('received', now));
    await repository.save(orderIn('finished', now));
    await repository.save(orderIn('delivered', now));

    const result = await useCase.execute({ page: 1, limit: 10 });
    expect(result.items.map((o) => o.status)).toEqual(['received']);
    expect(result.total).toBe(1);
  });

  it('still returns closed orders when their status is asked for', async () => {
    const finished = orderIn('finished', new Date());
    await repository.save(finished);

    const result = await useCase.execute({
      page: 1,
      limit: 10,
      status: 'finished',
    });
    expect(result.items).toEqual([finished]);
    expect(result.total).toBe(1);
  });
});
