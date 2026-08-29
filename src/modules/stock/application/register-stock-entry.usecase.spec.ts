import { InvalidStockMovementError } from '@/modules/stock/domain/errors/invalid-stock-movement.error';
import { SupplyNotFoundError } from '@/modules/stock/domain/errors/supply-not-found.error';
import { MovementType } from '@/modules/stock/domain/stock-movement.entity';
import { Supply } from '@/modules/stock/domain/supply.entity';
import { InMemoryStockMovementRepository } from '@/modules/stock/__test__/in-memory-stock-movement.repository';
import { InMemorySupplyRepository } from '@/modules/stock/__test__/in-memory-supply.repository';
import { RegisterStockEntryUseCase } from '@/modules/stock/application/register-stock-entry.usecase';

describe('RegisterStockEntryUseCase', () => {
  let supplyRepository: InMemorySupplyRepository;
  let movementRepository: InMemoryStockMovementRepository;
  let useCase: RegisterStockEntryUseCase;

  const givenSupply = async (): Promise<Supply> => {
    const supply = Supply.create({
      name: 'Filtro de óleo',
      priceInCents: 3200,
    });
    await supplyRepository.save(supply);
    return supply;
  };

  beforeEach(() => {
    supplyRepository = new InMemorySupplyRepository();
    movementRepository = new InMemoryStockMovementRepository();
    useCase = new RegisterStockEntryUseCase(
      supplyRepository,
      movementRepository,
    );
  });

  it('registers an entry and raises the available balance by the given quantity', async () => {
    const supply = await givenSupply();

    const result = await useCase.execute({ supplyId: supply.id, quantity: 7 });

    expect(result.movement.type).toBe(MovementType.In);
    expect(result.movement.supplyId).toBe(supply.id);
    expect(result.movement.quantity).toBe(7);
    expect(result.availableBalance).toBe(7);
    await expect(
      movementRepository.getAvailableBalance(supply.id),
    ).resolves.toBe(7);
  });

  it('accumulates successive entries into the balance', async () => {
    const supply = await givenSupply();

    await useCase.execute({ supplyId: supply.id, quantity: 4 });
    const second = await useCase.execute({ supplyId: supply.id, quantity: 6 });

    expect(second.availableBalance).toBe(10);
  });

  it('rejects an entry for a supply that does not exist', async () => {
    await expect(
      useCase.execute({ supplyId: crypto.randomUUID(), quantity: 3 }),
    ).rejects.toBeInstanceOf(SupplyNotFoundError);

    expect(movementRepository.movements).toHaveLength(0);
  });

  it.each([0, -5, 2.5])('rejects the invalid quantity %p', async (quantity) => {
    const supply = await givenSupply();

    await expect(
      useCase.execute({ supplyId: supply.id, quantity }),
    ).rejects.toBeInstanceOf(InvalidStockMovementError);

    expect(movementRepository.movements).toHaveLength(0);
  });

  it('applies concurrent entries for the same supply without a lost update', async () => {
    const supply = await givenSupply();

    await Promise.all([
      useCase.execute({ supplyId: supply.id, quantity: 5 }),
      useCase.execute({ supplyId: supply.id, quantity: 8 }),
    ]);

    expect(movementRepository.movements).toHaveLength(2);
    await expect(
      movementRepository.getAvailableBalance(supply.id),
    ).resolves.toBe(13);
  });
});
