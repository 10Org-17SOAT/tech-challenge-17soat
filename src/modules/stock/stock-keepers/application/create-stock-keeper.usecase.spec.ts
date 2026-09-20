import { StockKeeperCpfAlreadyExistsError } from '../domain/errors/stock-keeper-cpf-already-exists.error';
import { InMemoryStockKeeperRepository } from '../__test__/in-memory-stock-keeper.repository';
import { CreateStockKeeperUseCase } from './create-stock-keeper.usecase';

describe('CreateStockKeeperUseCase', () => {
  let repository: InMemoryStockKeeperRepository;
  let useCase: CreateStockKeeperUseCase;

  beforeEach(() => {
    repository = new InMemoryStockKeeperRepository();
    useCase = new CreateStockKeeperUseCase(repository);
  });

  it('creates a stock keeper and persists it', async () => {
    const stockKeeper = await useCase.execute({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Maria Estoquista',
      cpf: '52998224725',
      phone: '11987654321',
    });

    await expect(repository.findById(stockKeeper.id)).resolves.toBe(
      stockKeeper,
    );
  });

  it('rejects a CPF already used by an active stock keeper', async () => {
    await useCase.execute({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'Maria Estoquista',
      cpf: '52998224725',
      phone: '11987654321',
    });

    await expect(
      useCase.execute({
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'Outra Pessoa',
        cpf: '529.982.247-25',
        phone: '11912345678',
      }),
    ).rejects.toBeInstanceOf(StockKeeperCpfAlreadyExistsError);
  });
});
