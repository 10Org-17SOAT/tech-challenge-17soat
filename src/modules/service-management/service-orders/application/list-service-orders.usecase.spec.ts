import { ServiceOrder } from '../domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { ListServiceOrdersUseCase } from './list-service-orders.usecase';

// Orders always reference a vehicle; which one is irrelevant here.
const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';
const OPENED_BY_ID = '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b';
const OPENED_BY_NAME = 'Consultant Fixture';

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
});
