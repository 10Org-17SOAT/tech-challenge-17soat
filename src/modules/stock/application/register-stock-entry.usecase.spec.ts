import { InvalidStockMovementError } from '../domain/errors/invalid-stock-movement.error';
import { StockKeeperNotFoundError } from '../domain/errors/stock-keeper-not-found.error';
import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { MovementType } from '../domain/stock-movement.entity';
import { StockKeeper } from '../domain/stock-keeper.entity';
import { Supply } from '../domain/supply.entity';
import { InMemoryStockKeeperRepository } from '../__test__/in-memory-stock-keeper.repository';
import { InMemoryStockMovementRepository } from '../__test__/in-memory-stock-movement.repository';
import { InMemorySupplyRepository } from '../__test__/in-memory-supply.repository';
import { RegisterStockEntryUseCase } from './register-stock-entry.usecase';

describe('RegisterStockEntryUseCase', () => {
  let supplyRepository: InMemorySupplyRepository;
  let movementRepository: InMemoryStockMovementRepository;
  let stockKeeperRepository: InMemoryStockKeeperRepository;
  let useCase: RegisterStockEntryUseCase;

  const givenSupply = async (): Promise<Supply> => {
    const supply = Supply.create({
      name: 'Filtro de óleo',
      priceInCents: 3200,
    });
    await supplyRepository.save(supply);
    return supply;
  };

  const givenStockKeeper = async (): Promise<StockKeeper> => {
    const stockKeeper = StockKeeper.create({
      name: 'Maria Estoquista',
      cpf: '52998224725',
      phone: '11987654321',
    });
    await stockKeeperRepository.save(stockKeeper);
    return stockKeeper;
  };

  beforeEach(() => {
    supplyRepository = new InMemorySupplyRepository();
    movementRepository = new InMemoryStockMovementRepository();
    stockKeeperRepository = new InMemoryStockKeeperRepository();
    useCase = new RegisterStockEntryUseCase(
      supplyRepository,
      movementRepository,
      stockKeeperRepository,
    );
  });

  it('registers an entry and raises the available balance by the given quantity', async () => {
    const supply = await givenSupply();
    const stockKeeper = await givenStockKeeper();

    const result = await useCase.execute({
      supplyId: supply.id,
      quantity: 7,
      stockKeeperId: stockKeeper.id,
    });

    expect(result.movement.type).toBe(MovementType.In);
    expect(result.movement.supplyId).toBe(supply.id);
    expect(result.movement.quantity).toBe(7);
    expect(result.movement.performedById).toBe(stockKeeper.id);
    expect(result.movement.performedByName).toBe(stockKeeper.name);
    expect(result.availableBalance).toBe(7);
    await expect(
      movementRepository.getAvailableBalance(supply.id),
    ).resolves.toBe(7);
  });

  it('accumulates successive entries into the balance', async () => {
    const supply = await givenSupply();
    const stockKeeper = await givenStockKeeper();

    await useCase.execute({
      supplyId: supply.id,
      quantity: 4,
      stockKeeperId: stockKeeper.id,
    });
    const second = await useCase.execute({
      supplyId: supply.id,
      quantity: 6,
      stockKeeperId: stockKeeper.id,
    });

    expect(second.availableBalance).toBe(10);
  });

  it('rejects an entry for a supply that does not exist', async () => {
    const stockKeeper = await givenStockKeeper();

    await expect(
      useCase.execute({
        supplyId: crypto.randomUUID(),
        quantity: 3,
        stockKeeperId: stockKeeper.id,
      }),
    ).rejects.toBeInstanceOf(SupplyNotFoundError);

    expect(movementRepository.movements).toHaveLength(0);
  });

  it('rejects an entry for a stock keeper that does not exist', async () => {
    const supply = await givenSupply();

    await expect(
      useCase.execute({
        supplyId: supply.id,
        quantity: 3,
        stockKeeperId: crypto.randomUUID(),
      }),
    ).rejects.toBeInstanceOf(StockKeeperNotFoundError);

    expect(movementRepository.movements).toHaveLength(0);
  });

  it.each([0, -5, 2.5])('rejects the invalid quantity %p', async (quantity) => {
    const supply = await givenSupply();
    const stockKeeper = await givenStockKeeper();

    await expect(
      useCase.execute({
        supplyId: supply.id,
        quantity,
        stockKeeperId: stockKeeper.id,
      }),
    ).rejects.toBeInstanceOf(InvalidStockMovementError);

    expect(movementRepository.movements).toHaveLength(0);
  });

  it('applies concurrent entries for the same supply without a lost update', async () => {
    const supply = await givenSupply();
    const stockKeeper = await givenStockKeeper();

    await Promise.all([
      useCase.execute({
        supplyId: supply.id,
        quantity: 5,
        stockKeeperId: stockKeeper.id,
      }),
      useCase.execute({
        supplyId: supply.id,
        quantity: 8,
        stockKeeperId: stockKeeper.id,
      }),
    ]);

    expect(movementRepository.movements).toHaveLength(2);
    await expect(
      movementRepository.getAvailableBalance(supply.id),
    ).resolves.toBe(13);
  });
});
