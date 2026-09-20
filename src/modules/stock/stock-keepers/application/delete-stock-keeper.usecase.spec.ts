import { StockKeeperNotFoundError } from '../domain/errors/stock-keeper-not-found.error';
import { StockKeeper } from '../domain/stock-keeper.entity';
import { InMemoryStockKeeperRepository } from '../__test__/in-memory-stock-keeper.repository';
import { DeleteStockKeeperUseCase } from './delete-stock-keeper.usecase';

describe('DeleteStockKeeperUseCase', () => {
  let repository: InMemoryStockKeeperRepository;
  let useCase: DeleteStockKeeperUseCase;

  beforeEach(() => {
    repository = new InMemoryStockKeeperRepository();
    useCase = new DeleteStockKeeperUseCase(repository);
  });

  it('soft deletes the stock keeper, hiding it from lookups', async () => {
    const stockKeeper = StockKeeper.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Maria Estoquista',
      cpf: '52998224725',
      phone: '11987654321',
    });
    await repository.save(stockKeeper);

    await useCase.execute(stockKeeper.id);

    await expect(repository.findById(stockKeeper.id)).resolves.toBeNull();
    expect(
      repository.stockKeepers.get(stockKeeper.id)?.deletedAt,
    ).toBeInstanceOf(Date);
  });

  it('throws for an unknown or already deleted stock keeper', async () => {
    const stockKeeper = StockKeeper.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Maria Estoquista',
      cpf: '52998224725',
      phone: '11987654321',
    });
    await repository.save(stockKeeper);
    await useCase.execute(stockKeeper.id);

    await expect(useCase.execute(stockKeeper.id)).rejects.toBeInstanceOf(
      StockKeeperNotFoundError,
    );
  });
});
