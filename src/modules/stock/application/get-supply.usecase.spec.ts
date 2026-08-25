import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { StockMovement } from '../domain/stock-movement.entity';
import { Supply } from '../domain/supply.entity';
import { GetSupplyUseCase } from './get-supply.usecase';
import { InMemoryStockMovementRepository } from '../__test__/in-memory-stock-movement.repository';
import { InMemorySupplyRepository } from '../__test__/in-memory-supply.repository';

describe('GetSupplyUseCase', () => {
  let repository: InMemorySupplyRepository;
  let movementRepository: InMemoryStockMovementRepository;
  let useCase: GetSupplyUseCase;

  beforeEach(() => {
    repository = new InMemorySupplyRepository();
    movementRepository = new InMemoryStockMovementRepository();
    useCase = new GetSupplyUseCase(repository, movementRepository);
  });

  it('returns the supply by id', async () => {
    const supply = Supply.create({ name: 'Filtro de ar', priceInCents: 1500 });
    await repository.save(supply);

    await expect(useCase.execute(supply.id)).resolves.toEqual({
      supply,
      availableBalance: 0,
    });
  });

  it('returns the supply together with its available balance', async () => {
    const supply = Supply.create({ name: 'Filtro de ar', priceInCents: 1500 });
    await repository.save(supply);
    await movementRepository.save(StockMovement.in(supply.id, 8));
    await movementRepository.save(StockMovement.reserve(supply.id, 3, 'OS-1'));

    const result = await useCase.execute(supply.id);

    expect(result.availableBalance).toBe(5);
  });

  it('throws when the supply does not exist', async () => {
    await expect(useCase.execute(crypto.randomUUID())).rejects.toBeInstanceOf(
      SupplyNotFoundError,
    );
  });
});
