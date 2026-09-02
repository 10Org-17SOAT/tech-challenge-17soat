import { InvalidServiceError } from './errors/invalid-service.error';
import { Service } from './service.entity';

describe('Service', () => {
  it('creates a service with generated UUID and timestamps', () => {
    const service = Service.create({
      name: 'Troca de óleo',
      description: 'Inclui filtro',
      category: 'mechanical',
      laborPriceInCents: 9990,
    });

    expect(service.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
    expect(service.name).toBe('Troca de óleo');
    expect(service.description).toBe('Inclui filtro');
    expect(service.category).toBe('mechanical');
    expect(service.laborPriceInCents).toBe(9990);
    expect(service.estimatedDuration).toBeNull();
    expect(service.warrantyDays).toBeNull();
    expect(service.active).toBe(true);
    expect(service.createdAt).toBeInstanceOf(Date);
    expect(service.updatedAt).toBeInstanceOf(Date);
    expect(service.deletedAt).toBeNull();
  });

  it('trims the name and rejects empty names', () => {
    expect(() =>
      Service.create({
        name: '   ',
        category: 'mechanical',
        laborPriceInCents: 100,
      }),
    ).toThrow(InvalidServiceError);

    const service = Service.create({
      name: '  Alinhamento  ',
      category: 'tire',
      laborPriceInCents: 100,
    });
    expect(service.name).toBe('Alinhamento');
  });

  it('rejects negative or non-integer prices', () => {
    expect(() =>
      Service.create({
        name: 'X',
        category: 'mechanical',
        laborPriceInCents: -1,
      }),
    ).toThrow(InvalidServiceError);
    expect(() =>
      Service.create({
        name: 'X',
        category: 'mechanical',
        laborPriceInCents: 10.5,
      }),
    ).toThrow(InvalidServiceError);
  });

  it('rejects non-positive or non-integer estimatedDuration and warrantyDays', () => {
    expect(() =>
      Service.create({
        name: 'X',
        category: 'mechanical',
        laborPriceInCents: 100,
        estimatedDuration: 0,
      }),
    ).toThrow(InvalidServiceError);
    expect(() =>
      Service.create({
        name: 'X',
        category: 'mechanical',
        laborPriceInCents: 100,
        estimatedDuration: 30.5,
      }),
    ).toThrow(InvalidServiceError);
    expect(() =>
      Service.create({
        name: 'X',
        category: 'mechanical',
        laborPriceInCents: 100,
        warrantyDays: -1,
      }),
    ).toThrow(InvalidServiceError);
  });

  it('accepts optional estimatedDuration and warrantyDays when valid', () => {
    const service = Service.create({
      name: 'Revisão',
      category: 'mechanical',
      laborPriceInCents: 20000,
      estimatedDuration: 120,
      warrantyDays: 30,
    });
    expect(service.estimatedDuration).toBe(120);
    expect(service.warrantyDays).toBe(30);
  });

  it('updates only the provided fields, preserving invariants', () => {
    const service = Service.create({
      name: 'Alinhamento',
      category: 'tire',
      laborPriceInCents: 5000,
    });
    const before = service.updatedAt;

    service.update({ laborPriceInCents: 7000, active: false });

    expect(service.name).toBe('Alinhamento');
    expect(service.laborPriceInCents).toBe(7000);
    expect(service.active).toBe(false);
    expect(service.updatedAt.getTime()).toBeGreaterThanOrEqual(
      before.getTime(),
    );
    expect(() => service.update({ name: '  ' })).toThrow(InvalidServiceError);
    expect(() => service.update({ laborPriceInCents: -1 })).toThrow(
      InvalidServiceError,
    );
  });

  it('soft deletes by stamping deletedAt', () => {
    const service = Service.create({
      name: 'Balanceamento',
      category: 'tire',
      laborPriceInCents: 3000,
    });

    service.delete();

    expect(service.deletedAt).toBeInstanceOf(Date);
  });
});
