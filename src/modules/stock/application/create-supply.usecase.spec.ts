import { SupplyNameAlreadyExistsError } from '../domain/errors/supply-name-already-exists.error';
import { CreateSupplyUseCase } from './create-supply.usecase';
import { InMemorySupplyRepository } from '../__test__/in-memory-supply.repository';

describe('CreateSupplyUseCase', () => {
  let repository: InMemorySupplyRepository;
  let useCase: CreateSupplyUseCase;

  beforeEach(() => {
    repository = new InMemorySupplyRepository();
    useCase = new CreateSupplyUseCase(repository);
  });

  it('creates a supply and persists it', async () => {
    const supply = await useCase.execute({
      name: 'Óleo 5W30',
      priceInCents: 4990,
    });

    expect(supply.quantity).toBe(0);
    await expect(repository.findById(supply.id)).resolves.toBe(supply);
  });

  it('rejects a name already used by an active supply', async () => {
    await useCase.execute({ name: 'Óleo 5W30', priceInCents: 4990 });

    await expect(
      useCase.execute({ name: 'Óleo 5W30', priceInCents: 5990 }),
    ).rejects.toBeInstanceOf(SupplyNameAlreadyExistsError);
  });
});
