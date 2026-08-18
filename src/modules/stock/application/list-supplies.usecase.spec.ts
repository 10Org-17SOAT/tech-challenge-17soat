import { Supply } from '../domain/supply.entity';
import { InMemorySupplyRepository } from '../__test__/in-memory-supply.repository';
import { ListSuppliesUseCase } from './list-supplies.usecase';

describe('ListSuppliesUseCase', () => {
  let repository: InMemorySupplyRepository;
  let useCase: ListSuppliesUseCase;

  beforeEach(() => {
    repository = new InMemorySupplyRepository();
    useCase = new ListSuppliesUseCase(repository);
  });

  it('returns a page of supplies with pagination metadata', async () => {
    for (let i = 1; i <= 25; i++) {
      await repository.save(
        Supply.create({ name: `Supply ${i}`, priceInCents: 100 * i }),
      );
    }

    const result = await useCase.execute({ page: 2, limit: 20 });

    expect(result.items).toHaveLength(5);
    expect(result.total).toBe(25);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(20);
  });
});
