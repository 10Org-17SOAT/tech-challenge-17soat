import { InvalidSupplyError } from '@/modules/stock/domain/errors/invalid-supply.error';
import { Supply } from '@/modules/stock/domain/supply.entity';

describe('Supply', () => {
  it('creates a supply with generated UUID and timestamps', () => {
    const supply = Supply.create({
      name: 'Óleo 5W30',
      description: 'Óleo sintético',
      priceInCents: 4990,
    });

    expect(supply.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(supply.name).toBe('Óleo 5W30');
    expect(supply.description).toBe('Óleo sintético');
    expect(supply.priceInCents).toBe(4990);
    expect(supply.createdAt).toBeInstanceOf(Date);
    expect(supply.updatedAt).toBeInstanceOf(Date);
    expect(supply.deletedAt).toBeNull();
  });

  it('trims the name and rejects empty names', () => {
    expect(() => Supply.create({ name: '   ', priceInCents: 100 })).toThrow(
      InvalidSupplyError,
    );

    const supply = Supply.create({ name: '  Filtro  ', priceInCents: 100 });
    expect(supply.name).toBe('Filtro');
  });

  it('updates only the provided fields, preserving invariants', () => {
    const supply = Supply.create({ name: 'Filtro', priceInCents: 100 });
    const before = supply.updatedAt;

    supply.update({ priceInCents: 200 });

    expect(supply.name).toBe('Filtro');
    expect(supply.priceInCents).toBe(200);
    expect(supply.updatedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
    expect(() => supply.update({ name: '  ' })).toThrow(InvalidSupplyError);
    expect(() => supply.update({ priceInCents: -1 })).toThrow(
      InvalidSupplyError,
    );
  });

  it('soft deletes by stamping deletedAt', () => {
    const supply = Supply.create({ name: 'Filtro', priceInCents: 100 });

    supply.delete();

    expect(supply.deletedAt).toBeInstanceOf(Date);
  });

  it('rejects negative or non-integer prices', () => {
    expect(() => Supply.create({ name: 'Filtro', priceInCents: -1 })).toThrow(
      InvalidSupplyError,
    );
    expect(() => Supply.create({ name: 'Filtro', priceInCents: 10.5 })).toThrow(
      InvalidSupplyError,
    );
  });
});
