import { Order } from '../domain/order.entity';
import { InMemoryOrderRepository } from '../__test__/in-memory-order.repository';
import { ListOrdersUseCase } from './list-orders.usecase';

describe('ListOrdersUseCase', () => {
  let repository: InMemoryOrderRepository;
  let useCase: ListOrdersUseCase;

  beforeEach(() => {
    repository = new InMemoryOrderRepository();
    useCase = new ListOrdersUseCase(repository);
  });

  it('paginates and reports total', async () => {
    for (let i = 0; i < 5; i++) {
      await repository.save(Order.create({}));
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
    const a = Order.create({});
    const b = Order.create({});
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
    const order = Order.create({});
    await repository.save(order);
    order.delete();
    await repository.save(order);

    const result = await useCase.execute({ page: 1, limit: 10 });
    expect(result.items).toHaveLength(0);
    expect(result.total).toBe(0);
  });
});
