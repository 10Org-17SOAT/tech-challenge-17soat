import { ServiceOrder } from '../domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { ListServiceOrdersUseCase } from './list-service-orders.usecase';

const vehicleId = '11111111-1111-1111-1111-111111111111';

describe('ListServiceOrdersUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let useCase: ListServiceOrdersUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    useCase = new ListServiceOrdersUseCase(repository);
  });

  it('paginates and reports total', async () => {
    for (let i = 0; i < 5; i++) {
      await repository.save(ServiceOrder.create({ vehicleId }));
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
    const a = ServiceOrder.create({ vehicleId });
    const b = ServiceOrder.create({ vehicleId });
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
    const order = ServiceOrder.create({ vehicleId });
    await repository.save(order);
    order.delete();
    await repository.save(order);

    const result = await useCase.execute({ page: 1, limit: 10 });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
