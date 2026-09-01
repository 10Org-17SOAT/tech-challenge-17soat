import { StockKeeper } from '../domain/stock-keeper.entity';
import { InMemoryStockKeeperRepository } from '../__test__/in-memory-stock-keeper.repository';
import { ListStockKeepersUseCase } from './list-stock-keepers.usecase';

describe('ListStockKeepersUseCase', () => {
  let repository: InMemoryStockKeeperRepository;
  let useCase: ListStockKeepersUseCase;

  const names = (result: { items: StockKeeper[] }): string[] =>
    result.items.map((item) => item.name);

  // Generates a valid CPF (mod-11 check digits) for each test fixture index,
  // since the entity validates the CPF and a hand-mutated suffix would not
  // pass the check-digit algorithm for most indices.
  const checkDigit = (digits: string, weights: number[]): number => {
    const sum = weights.reduce(
      (acc, weight, index) => acc + Number(digits[index]) * weight,
      0,
    );
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  const validCpf = (index: number): string => {
    const base = String(100000000 + index).padStart(9, '0');
    const d1 = checkDigit(base, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = checkDigit(base + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
    return `${base}${d1}${d2}`;
  };

  beforeEach(() => {
    repository = new InMemoryStockKeeperRepository();
    useCase = new ListStockKeepersUseCase(repository);
  });

  it('returns a page of stock keepers with pagination metadata', async () => {
    for (let i = 1; i <= 25; i++) {
      await repository.save(
        StockKeeper.create({
          name: `Estoquista ${i}`,
          cpf: validCpf(i),
          phone: '11987654321',
        }),
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
      const people = [
        { name: 'Maria Estoquista', cpf: '52998224725' },
        { name: 'Marcos Almoxarife', cpf: '11144477735' },
        { name: 'Joana Silva', cpf: '96432101204' },
      ];
      for (const { name, cpf } of people) {
        await repository.save(
          StockKeeper.create({ name, cpf, phone: '11987654321' }),
        );
      }
    };

    it('filters stock keepers by a partial name match', async () => {
      await seed();

      const result = await useCase.execute({
        page: 1,
        limit: 20,
        name: 'mar',
      });

      expect(names(result)).toEqual(['Maria Estoquista', 'Marcos Almoxarife']);
      expect(result.total).toBe(2);
    });

    it('ignores case differences in the search term', async () => {
      await seed();

      const result = await useCase.execute({
        page: 1,
        limit: 20,
        name: 'JOANA',
      });

      expect(names(result)).toEqual(['Joana Silva']);
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
        name: 'ninguém',
      });

      expect(result.items).toEqual([]);
      expect(result.total).toBe(0);
    });

    it('does not return soft deleted stock keepers in the search', async () => {
      await seed();
      const [maria] = [...repository.stockKeepers.values()];
      maria.delete();
      await repository.save(maria);

      const result = await useCase.execute({
        page: 1,
        limit: 20,
        name: 'mar',
      });

      expect(names(result)).toEqual(['Marcos Almoxarife']);
      expect(result.total).toBe(1);
    });
  });
});
