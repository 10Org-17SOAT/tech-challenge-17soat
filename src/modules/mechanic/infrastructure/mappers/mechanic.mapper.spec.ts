import { MechanicMapper } from './mechanic.mapper';
import { Mechanic } from '../../domain/mechanic.entity';
import { InvalidCpfException } from '../../domain/exceptions/mechanic.exceptions';
import { MECHANIC_AVAILABILITY } from '../../domain/value-objects/mechanic-availability.enum';

describe('MechanicMapper', () => {
  const mapper = new MechanicMapper();

  const makeMechanic = (): Mechanic =>
    Mechanic.create({
      name: 'John Doe',
      cpf: '11144477735',
      email: 'john.doe@example.com',
      phone: { countryCode: '55', areaCode: '11', number: '912345678' },
      specialties: ['mechanical', 'electrical'],
      hireDate: new Date('2024-01-15T00:00:00.000Z'),
    });

  describe('toPersistence', () => {
    it('maps every field from the entity primitives', () => {
      const mechanic = makeMechanic();

      const row = mapper.toPersistence(mechanic);

      expect(row.id).toBe(mechanic.getId());
      expect(row.name).toBe('John Doe');
      expect(row.cpf).toBe('11144477735');
      expect(row.email).toBe('john.doe@example.com');
      expect(row.phone).toEqual({
        countryCode: '55',
        areaCode: '11',
        number: '912345678',
      });
      expect(row.specialties).toEqual(['mechanical', 'electrical']);
      expect(row.hireDate).toEqual(new Date('2024-01-15T00:00:00.000Z'));
      expect(row.availability).toBe(MECHANIC_AVAILABILITY.Available);
      expect(row.availableSince).toBeInstanceOf(Date);
      expect(row.currentServiceOrderId).toBeNull();
      expect(row.createdAt).toBeInstanceOf(Date);
      expect(row.updatedAt).toBeInstanceOf(Date);
      expect(row.deletedAt).toBeNull();
    });

    it('maps an allocated mechanic with its service order', () => {
      const mechanic = makeMechanic();
      mechanic.claim('OS-1');

      const row = mapper.toPersistence(mechanic);

      expect(row.availability).toBe(MECHANIC_AVAILABILITY.Allocated);
      expect(row.currentServiceOrderId).toBe('OS-1');
    });
  });

  describe('toDomain', () => {
    it('rebuilds a mechanic with value objects (round-trip)', () => {
      const mechanic = makeMechanic();
      mechanic.claim('OS-1');

      const restored = mapper.toDomain(mapper.toPersistence(mechanic));

      expect(restored.getId()).toBe(mechanic.getId());
      expect(restored.getName()).toBe(mechanic.getName());
      expect(restored.getCpf().getValue()).toBe('11144477735');
      expect(restored.getEmail().getValue()).toBe('john.doe@example.com');
      expect(restored.getPhone().toPrimitives()).toEqual({
        countryCode: '55',
        areaCode: '11',
        number: '912345678',
      });
      expect(restored.getSpecialties()).toEqual(['mechanical', 'electrical']);
      expect(restored.getHireDate()).toEqual(
        new Date('2024-01-15T00:00:00.000Z'),
      );
      expect(restored.getAvailability()).toBe(MECHANIC_AVAILABILITY.Allocated);
      expect(restored.getCurrentServiceOrderId()).toBe('OS-1');
      expect(restored.getAvailableSince()).toEqual(mechanic.getAvailableSince());
      expect(restored.getCreatedAt()).toEqual(mechanic.getCreatedAt());
      expect(restored.getUpdatedAt()).toEqual(mechanic.getUpdatedAt());
      expect(restored.getDeletedAt()).toBeNull();
    });

    it('fails fast on a corrupted cpf', () => {
      const mechanic = makeMechanic();
      const row = mapper.toPersistence(mechanic);
      row.cpf = 'not-a-cpf';

      expect(() => mapper.toDomain(row)).toThrow(InvalidCpfException);
    });

    it('fails fast on a corrupted email', () => {
      const mechanic = makeMechanic();
      const row = mapper.toPersistence(mechanic);
      row.email = 'not-an-email';

      expect(() => mapper.toDomain(row)).toThrow();
    });

    it('fails fast on a corrupted phone', () => {
      const mechanic = makeMechanic();
      const row = mapper.toPersistence(mechanic);
      row.phone = { countryCode: '', areaCode: '', number: '' };

      expect(() => mapper.toDomain(row)).toThrow();
    });
  });
});