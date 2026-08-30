import { StockKeeperNotFoundError } from '../domain/errors/stock-keeper-not-found.error';
import { StockKeeper } from '../domain/stock-keeper.entity';
import { InMemoryStockKeeperRepository } from '../__test__/in-memory-stock-keeper.repository';
import { GetStockKeeperUseCase } from './get-stock-keeper.usecase';

describe('GetStockKeeperUseCase', () => {
  let repository: InMemoryStockKeeperRepository;
  let useCase: GetStockKeeperUseCase;

  beforeEach(() => {
    repository = new InMemoryStockKeeperRepository();
    useCase = new GetStockKeeperUseCase(repository);
  });

  it('returns the stock keeper by id', async () => {
    const stockKeeper = StockKeeper.create({
      name: 'Maria Estoquista',
      cpf: '52998224725',
      phone: '11987654321',
    });
    await repository.save(stockKeeper);

    await expect(useCase.execute(stockKeeper.id)).resolves.toBe(stockKeeper);
  });

  it('throws when the stock keeper does not exist', async () => {
    await expect(
      useCase.execute(crypto.randomUUID()),
    ).rejects.toBeInstanceOf(StockKeeperNotFoundError);
  });
});
