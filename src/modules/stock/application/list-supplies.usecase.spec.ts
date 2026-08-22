import { Supply } from '../domain/supply.entity';
import { InMemorySupplyRepository } from '../__test__/in-memory-supply.repository';
import { ListSuppliesUseCase } from './list-supplies.usecase';

describe('ListSuppliesUseCase', () => {
  let repository: InMemorySupplyRepository;
  let useCase: ListSuppliesUseCase;

  beforeEach(() => {
    repository = new InMemorySupplyRepository();
    useCase = new ListSuppliesUseCase(repository);
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

      expect(result.items.map((s) => s.name)).toEqual([
        'Óleo 5W30',
        'Filtro de óleo',
      ]);
      expect(result.total).toBe(2);
    });

    it('ignores case differences in the search term', async () => {
      await seed();

      const result = await useCase.execute({
        page: 1,
        limit: 20,
        name: 'PASTILHA',
      });

      expect(result.items.map((s) => s.name)).toEqual(['Pastilha de freio']);
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

      expect(result.items.map((s) => s.name)).toEqual(['Filtro de óleo']);
      expect(result.total).toBe(1);
    });
  });
});
