import { MechanicMapper } from './mechanic.mapper';
import { Mechanic } from '../../domain/mechanic.entity';
import { InvalidCpfException } from '../../domain/exceptions/mechanic.exceptions';
import { MECHANIC_AVAILABILITY } from '../../domain/value-objects/mechanic-availability.enum';

describe('MechanicMapper', () => {
  const makeMechanic = (): Mechanic =>
    Mechanic.create({
      userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
      name: 'John Doe',
      cpf: '11144477735',
      email: 'john.doe@example.com',
      phone: { countryCode: '55', areaCode: '11', number: '912345678' },
      specialties: ['mechanical', 'electrical'],
      hireDate: new Date('2024-01-15T00:00:00.000Z'),
    });

  describe('toPersistence', () => {
    it('maps profile data and allocation state separately', () => {
      const mechanic = makeMechanic();

      const { profile, availability } = MechanicMapper.toPersistence(mechanic);

      expect(profile.user_id).toBe(mechanic.getUserId());
      expect(profile.name).toBe('John Doe');
      expect(profile.document).toBe('11144477735');
      expect(profile.email).toBe('john.doe@example.com');
      expect(profile.phone).toEqual({
        countryCode: '55',
        areaCode: '11',
        number: '912345678',
      });
      expect(profile.attributes).toEqual({
        specialties: ['mechanical', 'electrical'],
        hireDate: '2024-01-15T00:00:00.000Z',
      });
      expect(availability.userId).toBe(mechanic.getUserId());
      expect(availability.availability).toBe(MECHANIC_AVAILABILITY.Available);
      expect(availability.availableSince).toBeInstanceOf(Date);
      expect(availability.currentServiceOrderId).toBeNull();
    });

    it('maps an allocated mechanic with its service order', () => {
      const mechanic = makeMechanic();
      mechanic.claim('OS-1');

      const { availability } = MechanicMapper.toPersistence(mechanic);

      expect(availability.availability).toBe(MECHANIC_AVAILABILITY.Allocated);
      expect(availability.currentServiceOrderId).toBe('OS-1');
    });
  });

  describe('toDomain', () => {
    it('rebuilds a mechanic with value objects (round-trip)', () => {
      const mechanic = makeMechanic();
      mechanic.claim('OS-1');
      const { profile, availability } = MechanicMapper.toPersistence(mechanic);

      const restored = MechanicMapper.toDomain({
        userId: mechanic.getUserId(),
        name: mechanic.getName(),
        email: mechanic.getEmail().getValue(),
        document: mechanic.getCpf().getValue(),
        phone: profile.phone,
        attributes: profile.attributes ?? {},
        createdAt: mechanic.getCreatedAt(),
        updatedAt: mechanic.getUpdatedAt(),
        deletedAt: mechanic.getDeletedAt(),
        availability: availability.availability,
        availableSince: availability.availableSince,
        currentServiceOrderId: availability.currentServiceOrderId ?? null,
      });

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
      expect(restored.getAvailableSince()).toEqual(
        mechanic.getAvailableSince(),
      );
      expect(restored.getCreatedAt()).toEqual(mechanic.getCreatedAt());
      expect(restored.getUpdatedAt()).toEqual(mechanic.getUpdatedAt());
      expect(restored.getDeletedAt()).toBeNull();
    });

    it('fails fast on a corrupted cpf', () => {
      const mechanic = makeMechanic();
      const persistence = MechanicMapper.toPersistence(mechanic);

      expect(() =>
        MechanicMapper.toDomain({
          userId: mechanic.getUserId(),
          name: mechanic.getName(),
          email: mechanic.getEmail().getValue(),
          document: 'not-a-cpf',
          phone: persistence.profile.phone,
          attributes: persistence.profile.attributes ?? {},
          createdAt: mechanic.getCreatedAt(),
          updatedAt: mechanic.getUpdatedAt(),
          deletedAt: null,
          availability: persistence.availability.availability,
          availableSince: persistence.availability.availableSince,
          currentServiceOrderId: null,
        }),
      ).toThrow(InvalidCpfException);
    });

    it('fails fast on a corrupted email', () => {
      const mechanic = makeMechanic();
      const persistence = MechanicMapper.toPersistence(mechanic);

      expect(() =>
        MechanicMapper.toDomain({
          userId: mechanic.getUserId(),
          name: mechanic.getName(),
          email: 'not-an-email',
          document: mechanic.getCpf().getValue(),
          phone: persistence.profile.phone,
          attributes: persistence.profile.attributes ?? {},
          createdAt: mechanic.getCreatedAt(),
          updatedAt: mechanic.getUpdatedAt(),
          deletedAt: null,
          availability: persistence.availability.availability,
          availableSince: persistence.availability.availableSince,
          currentServiceOrderId: null,
        }),
      ).toThrow();
    });

    it('fails fast on a corrupted phone', () => {
      const mechanic = makeMechanic();
      const persistence = MechanicMapper.toPersistence(mechanic);

      expect(() =>
        MechanicMapper.toDomain({
          userId: mechanic.getUserId(),
          name: mechanic.getName(),
          email: mechanic.getEmail().getValue(),
          document: mechanic.getCpf().getValue(),
          phone: { countryCode: '', areaCode: '', number: '' },
          attributes: persistence.profile.attributes ?? {},
          createdAt: mechanic.getCreatedAt(),
          updatedAt: mechanic.getUpdatedAt(),
          deletedAt: null,
          availability: persistence.availability.availability,
          availableSince: persistence.availability.availableSince,
          currentServiceOrderId: null,
        }),
      ).toThrow();
    });

    it('fails fast on invalid mechanic attributes', () => {
      const mechanic = makeMechanic();
      const persistence = MechanicMapper.toPersistence(mechanic);

      expect(() =>
        MechanicMapper.toDomain({
          userId: mechanic.getUserId(),
          name: mechanic.getName(),
          email: mechanic.getEmail().getValue(),
          document: mechanic.getCpf().getValue(),
          phone: persistence.profile.phone,
          attributes: { specialties: ['unknown'], hireDate: 'bad-date' },
          createdAt: mechanic.getCreatedAt(),
          updatedAt: mechanic.getUpdatedAt(),
          deletedAt: null,
          availability: persistence.availability.availability,
          availableSince: persistence.availability.availableSince,
          currentServiceOrderId: null,
        }),
      ).toThrow();
    });
  });
});
