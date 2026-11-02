import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { Supply } from '../domain/supply.entity';
import { DeleteSupplyUseCase } from './delete-supply.usecase';
import { InMemorySupplyRepository } from '../__test__/in-memory-supply.repository';

describe('DeleteSupplyUseCase', () => {
  let repository: InMemorySupplyRepository;
  let useCase: DeleteSupplyUseCase;

  beforeEach(() => {
    repository = new InMemorySupplyRepository();
    useCase = new DeleteSupplyUseCase(repository);
  });

  it('soft deletes the supply, hiding it from lookups', async () => {
    const supply = Supply.create({ name: 'Filtro', priceInCents: 100 });
    await repository.save(supply);

    await useCase.execute(supply.id);

    await expect(repository.findById(supply.id)).resolves.toBeNull();
    expect(repository.supplies.get(supply.id)?.deletedAt).toBeInstanceOf(Date);
  });

  it('throws for an unknown or already deleted supply', async () => {
    const supply = Supply.create({ name: 'Filtro', priceInCents: 100 });
    await repository.save(supply);
    await useCase.execute(supply.id);

    await expect(useCase.execute(supply.id)).rejects.toBeInstanceOf(
      SupplyNotFoundError,
    );
  });
});
