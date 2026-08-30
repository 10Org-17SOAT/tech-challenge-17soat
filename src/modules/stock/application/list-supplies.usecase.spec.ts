import { StockMovement } from '../domain/stock-movement.entity';
import { Supply } from '../domain/supply.entity';
import { InMemoryStockMovementRepository } from '../__test__/in-memory-stock-movement.repository';
import { InMemorySupplyRepository } from '../__test__/in-memory-supply.repository';
import { RecordingDomainEventPublisher } from '../__test__/recording-domain-event.publisher';
import { LookupStockUseCase } from './lookup-stock.usecase';
import { ListSuppliesUseCase } from './list-supplies.usecase';

const TEST_PERFORMER = { id: '11111111-1111-1111-1111-111111111111', name: 'Estoquista Teste' };

describe('ListSuppliesUseCase', () => {
  let repository: InMemorySupplyRepository;
  let movementRepository: InMemoryStockMovementRepository;
  let useCase: ListSuppliesUseCase;

  const names = (result: { items: { supply: Supply }[] }): string[] =>
    result.items.map((item) => item.supply.name);

  beforeEach(() => {
    repository = new InMemorySupplyRepository();
    movementRepository = new InMemoryStockMovementRepository();
    useCase = new ListSuppliesUseCase(repository, movementRepository);
  });

  describe('available balance', () => {
    it('includes availableBalance on every item of the listing', async () => {
      const oil = Supply.create({ name: 'Óleo 5W30', priceInCents: 4990 });
      const filter = Supply.create({ name: 'Filtro', priceInCents: 3200 });
      await repository.save(oil);
      await repository.save(filter);
      await movementRepository.save(StockMovement.in(oil.id, 10, TEST_PERFORMER));
      await movementRepository.save(StockMovement.reserve(oil.id, 4, 'OS-1'));
      await movementRepository.save(StockMovement.in(filter.id, 2, TEST_PERFORMER));

      const result = await useCase.execute({ page: 1, limit: 20 });

      const balances = new Map(
        result.items.map((item) => [item.supply.id, item.availableBalance]),
      );
      expect(balances.get(oil.id)).toBe(6);
      expect(balances.get(filter.id)).toBe(2);
    });

    it('reports a zero availableBalance for a supply without movements', async () => {
      const supply = Supply.create({ name: 'Vela', priceInCents: 900 });
      await repository.save(supply);

      const result = await useCase.execute({ page: 1, limit: 20 });

      expect(result.items[0].availableBalance).toBe(0);
    });

    it('does not publish PurchaseRequestNeeded when listing supplies with zero balance', async () => {
      const publisher = new RecordingDomainEventPublisher();
      const lookup = new LookupStockUseCase(
        repository,
        movementRepository,
        publisher,
      );
      const supply = Supply.create({ name: 'Amortecedor', priceInCents: 100 });
      await repository.save(supply);

      // Control: the explicit lookup is the one surface that may publish.
      await lookup.execute(supply.id);
      expect(publisher.events).toHaveLength(1);

      await useCase.execute({ page: 1, limit: 20 });

      expect(publisher.events).toHaveLength(1);
    });
  });

  it('returns a page of supplies with pagination metadata', async () => {
    for (let i = 1; i <= 25; i++) {
      await repository.save(
        Supply.create({ name: `Supply ${i}`, priceInCents: 100 * i }),
      );
    }

    const result = await useCase.execute({ page: 2, limit: 20 });

    expect(result.items).toHaveLength(5);
    expect(result.total).toBe(25);
    expect(result.page).toBe(2);
    expect(result.limit).toBe(20);
  });

  describe('name filter', () => {
    const seed = async () => {
      for (const name of ['Óleo 5W30', 'Filtro de óleo', 'Pastilha de freio']) {
        await repository.save(Supply.create({ name, priceInCents: 100 }));
      }
    };

    it('filters supplies by a partial name match', async () => {
      await seed();

      const result = await useCase.execute({
        page: 1,
        limit: 20,
        name: 'óleo',
      });

      expect(names(result)).toEqual(['Óleo 5W30', 'Filtro de óleo']);
      expect(result.total).toBe(2);
    });

    it('ignores case differences in the search term', async () => {
      await seed();

      const result = await useCase.execute({
        page: 1,
        limit: 20,
        name: 'PASTILHA',
      });

      expect(names(result)).toEqual(['Pastilha de freio']);
    });

    it('returns the full listing when the search term is omitted', async () => {
      await seed();

      const result = await useCase.execute({ page: 1, limit: 20 });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
    });

    it('returns an empty list with total zero when nothing matches', async () => {
      await seed();

      const result = await useCase.execute({
        page: 1,
        limit: 20,
        name: 'amortecedor',
      });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('does not return soft deleted supplies in the search', async () => {
      await seed();
      const [oil] = [...repository.supplies.values()];
      oil.delete();
      await repository.save(oil);

      const result = await useCase.execute({
        page: 1,
        limit: 20,
        name: 'óleo',
      });

      expect(names(result)).toEqual(['Filtro de óleo']);
      expect(result.total).toBe(1);
    });
  });
});
