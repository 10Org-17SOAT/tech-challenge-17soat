import { InvalidOrderError } from '../domain/errors/invalid-order.error';
import { OrderNotFoundError } from '../domain/errors/order-not-found.error';
import { Order } from '../domain/order.entity';
import { InMemoryOrderRepository } from '../__test__/in-memory-order.repository';
import { UpdateOrderUseCase } from './update-order.usecase';

describe('UpdateOrderUseCase', () => {
  let repository: InMemoryOrderRepository;
  let useCase: UpdateOrderUseCase;

  beforeEach(() => {
    repository = new InMemoryOrderRepository();
    useCase = new UpdateOrderUseCase(repository);
  });

  it('updates editable fields on an order in received', async () => {
    const order = Order.create({});
    await repository.save(order);

    const updated = await useCase.execute(order.id, {
      notes: 'agendar retorno',
      vehicleMileageAtEntry: 42000,
    });

    expect(updated.notes).toBe('agendar retorno');
    expect(updated.vehicleMileageAtEntry).toBe(42000);
  });

  it('throws when the order does not exist', async () => {
    await expect(
      useCase.execute(crypto.randomUUID(), { notes: 'x' }),
    ).rejects.toBeInstanceOf(OrderNotFoundError);
  });

  it('blocks mileage edit after in_execution', async () => {
    const order = Order.create({});
    order.transitionTo('in_diagnosis');
    order.transitionTo('awaiting_approval');
    order.transitionTo('awaiting_execution');
    order.transitionTo('in_execution');
    await repository.save(order);

    await expect(
      useCase.execute(order.id, { vehicleMileageAtEntry: 99999 }),
    ).rejects.toBeInstanceOf(InvalidOrderError);
  });
});
