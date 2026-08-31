import { SupplyNameAlreadyExistsError } from '../domain/errors/supply-name-already-exists.error';
import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { Supply } from '../domain/supply.entity';
import { StockMovement } from '../domain/stock-movement.entity';
import { InMemoryStockMovementRepository } from '../__test__/in-memory-stock-movement.repository';
import { InMemorySupplyRepository } from '../__test__/in-memory-supply.repository';
import { UpdateSupplyUseCase } from './update-supply.usecase';

describe('UpdateSupplyUseCase', () => {
  let repository: InMemorySupplyRepository;
  let movementRepository: InMemoryStockMovementRepository;
  let useCase: UpdateSupplyUseCase;

  beforeEach(() => {
    repository = new InMemorySupplyRepository();
    movementRepository = new InMemoryStockMovementRepository();
    useCase = new UpdateSupplyUseCase(repository, movementRepository);
  });

  it('returns the updated supply together with its available balance', async () => {
    const supply = Supply.create({ name: 'Filtro', priceInCents: 100 });
    await repository.save(supply);
    await movementRepository.save(StockMovement.in(supply.id, 4));

    const result = await useCase.execute(supply.id, { priceInCents: 250 });

    expect(result.availableBalance).toBe(4);
  });

  it('updates only the provided fields', async () => {
    const supply = Supply.create({ name: 'Filtro', priceInCents: 100 });
    await repository.save(supply);

    const { supply: updated } = await useCase.execute(supply.id, {
      priceInCents: 250,
    });

    expect(updated.name).toBe('Filtro');
    expect(updated.priceInCents).toBe(250);
  });

  it('throws when the supply does not exist', async () => {
    await expect(
      useCase.execute(crypto.randomUUID(), { name: 'X' }),
    ).rejects.toBeInstanceOf(SupplyNotFoundError);
  });

  it('rejects renaming to a name used by another active supply', async () => {
    const a = Supply.create({ name: 'Filtro A', priceInCents: 100 });
    const b = Supply.create({ name: 'Filtro B', priceInCents: 100 });
    await repository.save(a);
    await repository.save(b);

    await expect(
      useCase.execute(b.id, { name: 'Filtro A' }),
    ).rejects.toBeInstanceOf(SupplyNameAlreadyExistsError);
  });

  it('allows keeping its own name', async () => {
    const supply = Supply.create({ name: 'Filtro', priceInCents: 100 });
    await repository.save(supply);

    await expect(
      useCase.execute(supply.id, { name: 'Filtro', priceInCents: 300 }),
    ).resolves.toMatchObject({ supply: { priceInCents: 300 } });
  });
});
