import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { Supply } from '../domain/supply.entity';
import { GetSupplyUseCase } from './get-supply.usecase';
import { InMemorySupplyRepository } from '../__test__/in-memory-supply.repository';

describe('GetSupplyUseCase', () => {
  let repository: InMemorySupplyRepository;
  let useCase: GetSupplyUseCase;

  beforeEach(() => {
    repository = new InMemorySupplyRepository();
    useCase = new GetSupplyUseCase(repository);
  });

  it('returns the supply by id', async () => {
    const supply = Supply.create({ name: 'Filtro de ar', priceInCents: 1500 });
    await repository.save(supply);

    await expect(useCase.execute(supply.id)).resolves.toBe(supply);
  });

  it('throws when the supply does not exist', async () => {
    await expect(useCase.execute(crypto.randomUUID())).rejects.toBeInstanceOf(
      SupplyNotFoundError,
    );
  });
});
