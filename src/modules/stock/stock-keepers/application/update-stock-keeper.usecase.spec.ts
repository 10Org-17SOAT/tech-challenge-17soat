import { StockKeeperNotFoundError } from '../domain/errors/stock-keeper-not-found.error';
import { InvalidStockKeeperError } from '../domain/errors/invalid-stock-keeper.error';
import { StockKeeper } from '../domain/stock-keeper.entity';
import { InMemoryStockKeeperRepository } from '../__test__/in-memory-stock-keeper.repository';
import { UpdateStockKeeperUseCase } from './update-stock-keeper.usecase';

describe('UpdateStockKeeperUseCase', () => {
  let repository: InMemoryStockKeeperRepository;
  let useCase: UpdateStockKeeperUseCase;

  beforeEach(() => {
    repository = new InMemoryStockKeeperRepository();
    useCase = new UpdateStockKeeperUseCase(repository);
  });

  it('updates only the provided fields', async () => {
    const stockKeeper = StockKeeper.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Maria Estoquista',
      cpf: '52998224725',
      phone: '11987654321',
    });
    await repository.save(stockKeeper);

    const updated = await useCase.execute(stockKeeper.id, {
      phone: '11912345678',
    });

    expect(updated.name).toBe('Maria Estoquista');
    expect(updated.phone).toBe('11912345678');
    expect(updated.cpf).toBe('52998224725');
  });

  it('throws when the stock keeper does not exist', async () => {
    await expect(
      useCase.execute(crypto.randomUUID(), { name: 'X' }),
    ).rejects.toBeInstanceOf(StockKeeperNotFoundError);
  });

  it('rejects an invalid phone', async () => {
    const stockKeeper = StockKeeper.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Maria Estoquista',
      cpf: '52998224725',
      phone: '11987654321',
    });
    await repository.save(stockKeeper);

    await expect(
      useCase.execute(stockKeeper.id, { phone: '123' }),
    ).rejects.toBeInstanceOf(InvalidStockKeeperError);
  });
});
