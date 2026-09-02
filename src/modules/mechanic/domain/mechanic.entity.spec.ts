import { Mechanic } from './mechanic.entity';
import { Cpf } from './value-objects/cpf.value-object';
import { Email } from './value-objects/email.value-object';
import { Phone } from './value-objects/phone.value-object';
import { MECHANIC_AVAILABILITY } from './value-objects/mechanic-availability.enum';
import type { Specialty } from './value-objects/specialty.enum';
import {
  AllocatedMechanicException,
  InvalidMechanicException,
  MechanicNotAllocatedException,
  MechanicNotAvailableException,
  WrongServiceOrderException,
} from './exceptions/mechanic.exceptions';

const validProps = {
  userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
  name: 'John Doe',
  cpf: '11144477735',
  email: 'john.doe@example.com',
  phone: { countryCode: '55', areaCode: '11', number: '912345678' },
  specialties: ['mechanical', 'electrical'] as Specialty[],
  hireDate: new Date('2024-01-15T00:00:00.000Z'),
};

const makeMechanic = (): Mechanic => Mechanic.create({ ...validProps });

describe('Mechanic', () => {
  describe('create', () => {
    it('creates a mechanic in AVAILABLE state with availableSince set', () => {
      const mechanic = makeMechanic();

      expect(mechanic.getAvailability()).toBe(MECHANIC_AVAILABILITY.Available);
      expect(mechanic.getAvailableSince()).toBeInstanceOf(Date);
      expect(mechanic.getCurrentServiceOrderId()).toBeNull();
      expect(mechanic.getDeletedAt()).toBeNull();
      expect(mechanic.getId()).toBeDefined();
    });

    it('rejects an empty name', () => {
      expect(() => Mechanic.create({ ...validProps, name: '   ' })).toThrow(
        InvalidMechanicException,
      );
    });

    it('rejects a mechanic without specialties', () => {
      expect(() => Mechanic.create({ ...validProps, specialties: [] })).toThrow(
        InvalidMechanicException,
      );
    });

    it('rejects an invalid cpf', () => {
      expect(() => Mechanic.create({ ...validProps, cpf: '123' })).toThrow();
    });

    it('rejects an invalid email', () => {
      expect(() =>
        Mechanic.create({ ...validProps, email: 'not-an-email' }),
      ).toThrow();
    });

    it('rejects an invalid phone', () => {
      expect(() =>
        Mechanic.create({
          ...validProps,
          phone: { countryCode: '', areaCode: '11', number: '912345678' },
        }),
      ).toThrow();
    });

    it('rejects creation without a linked user account', () => {
      expect(() => Mechanic.create({ ...validProps, userId: '' })).toThrow(
        InvalidMechanicException,
      );
    });
  });


  describe('updateProfile', () => {
    it('updates only the provided fields', () => {
      const mechanic = makeMechanic();

      const newHireDate = new Date('2025-02-01T00:00:00.000Z');
      mechanic.updateProfile({
        name: 'Jane Doe',
        email: 'jane.doe@example.com',
        phone: { countryCode: '55', areaCode: '11', number: '987654321' },
        hireDate: newHireDate,
      });

      expect(mechanic.getName()).toBe('Jane Doe');
      expect(mechanic.getEmail().getValue()).toBe('jane.doe@example.com');
      expect(mechanic.getCpf().getValue()).toBe('11144477735');
      expect(mechanic.getPhone().getNumber()).toBe('987654321');
      expect(mechanic.getHireDate()).toBe(newHireDate);
      expect(mechanic.getSpecialties()).toEqual(['mechanical', 'electrical']);
    });

    it('never touches cpf, availability, availableSince, or currentServiceOrderId', () => {
      const mechanic = makeMechanic();
      const availableSince = mechanic.getAvailableSince();

      mechanic.updateProfile({ name: 'Jane Doe' });

      expect(mechanic.getCpf().getValue()).toBe('11144477735');
      expect(mechanic.getAvailability()).toBe(MECHANIC_AVAILABILITY.Available);
      expect(mechanic.getAvailableSince()).toBe(availableSince);
      expect(mechanic.getCurrentServiceOrderId()).toBeNull();
    });

    it('validates provided fields', () => {
      const mechanic = makeMechanic();

      expect(() => mechanic.updateProfile({ email: 'not-an-email' })).toThrow();
    });

    it('touches updatedAt', () => {
      const mechanic = makeMechanic();
      const previous = mechanic.getUpdatedAt();

      mechanic.updateProfile({ name: 'Jane Doe' });

      expect(mechanic.getUpdatedAt().getTime()).toBeGreaterThanOrEqual(
        previous.getTime(),
      );
    });
  });

  describe('claim', () => {
    it('transitions AVAILABLE to ALLOCATED and records the service order', () => {
      const mechanic = makeMechanic();

      mechanic.claim('OS-1');

      expect(mechanic.getAvailability()).toBe(MECHANIC_AVAILABILITY.Allocated);
      expect(mechanic.getCurrentServiceOrderId()).toBe('OS-1');
    });

    it('rejects a claim from ALLOCATED', () => {
      const mechanic = makeMechanic();
      mechanic.claim('OS-1');

      expect(() => mechanic.claim('OS-2')).toThrow(
        MechanicNotAvailableException,
      );
    });

    it('rejects a claim from OFF_DUTY', () => {
      const now = new Date();
      const mechanic = Mechanic.restore({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'John Doe',
        cpf: new Cpf('11144477735'),
        email: new Email('john.doe@example.com'),
        phone: new Phone({
          countryCode: '55',
          areaCode: '11',
          number: '912345678',
        }),
        specialties: ['mechanical'],
        hireDate: new Date('2024-01-15T00:00:00.000Z'),
        availability: MECHANIC_AVAILABILITY.OffDuty,
        availableSince: now,
        currentServiceOrderId: null,
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      expect(() => mechanic.claim('OS-1')).toThrow(
        MechanicNotAvailableException,
      );
    });

    it('rejects a claim from INACTIVE', () => {
      const mechanic = makeMechanic();
      mechanic.deactivate();

      expect(() => mechanic.claim('OS-1')).toThrow(
        MechanicNotAvailableException,
      );
    });

    it('rejects an empty serviceOrderId', () => {
      const mechanic = makeMechanic();

      expect(() => mechanic.claim('   ')).toThrow(InvalidMechanicException);
    });
  });

  describe('release', () => {
    it('transitions ALLOCATED to AVAILABLE, resets availableSince, and clears the order', () => {
      const mechanic = makeMechanic();
      mechanic.claim('OS-1');

      mechanic.release('OS-1');

      expect(mechanic.getAvailability()).toBe(MECHANIC_AVAILABILITY.Available);
      expect(mechanic.getCurrentServiceOrderId()).toBeNull();
      expect(mechanic.getAvailableSince()).toBeInstanceOf(Date);
    });

    it('rejects a release from AVAILABLE', () => {
      const mechanic = makeMechanic();

      expect(() => mechanic.release('OS-1')).toThrow(
        MechanicNotAllocatedException,
      );
    });

    it('rejects a release with a mismatched service order', () => {
      const mechanic = makeMechanic();
      mechanic.claim('OS-1');

      expect(() => mechanic.release('OS-2')).toThrow(
        WrongServiceOrderException,
      );
    });
  });

  describe('deactivate', () => {
    it('transitions AVAILABLE to INACTIVE and sets deletedAt', () => {
      const mechanic = makeMechanic();

      mechanic.deactivate();

      expect(mechanic.getAvailability()).toBe(MECHANIC_AVAILABILITY.Inactive);
      expect(mechanic.getDeletedAt()).toBeInstanceOf(Date);
    });

    it('rejects deactivation from ALLOCATED', () => {
      const mechanic = makeMechanic();
      mechanic.claim('OS-1');

      expect(() => mechanic.deactivate()).toThrow(AllocatedMechanicException);
    });
  });

  describe('restore', () => {
    it('rebuilds a mechanic from persisted primitives', () => {
      const now = new Date();
      const mechanic = Mechanic.restore({
        id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'John Doe',
        cpf: new Cpf('11144477735'),
        email: new Email('john.doe@example.com'),
        phone: new Phone({
          countryCode: '55',
          areaCode: '11',
          number: '912345678',
        }),
        specialties: ['mechanical'],
        hireDate: new Date('2024-01-15T00:00:00.000Z'),
        availability: MECHANIC_AVAILABILITY.Allocated,
        availableSince: now,
        currentServiceOrderId: 'OS-1',
        createdAt: now,
        updatedAt: now,
        deletedAt: null,
      });

      expect(mechanic.getId()).toBe('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11');
      expect(mechanic.getAvailability()).toBe(MECHANIC_AVAILABILITY.Allocated);
      expect(mechanic.getCurrentServiceOrderId()).toBe('OS-1');
    });

    it('fails fast on a corrupted row (invalid cpf)', () => {
      const now = new Date();
      expect(() =>
        Mechanic.restore({
          id: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          name: 'John Doe',
          cpf: new Cpf('123'),
          email: new Email('john.doe@example.com'),
          phone: new Phone({
            countryCode: '55',
            areaCode: '11',
            number: '912345678',
          }),
          specialties: ['mechanical'],
          hireDate: new Date('2024-01-15T00:00:00.000Z'),
          availability: MECHANIC_AVAILABILITY.Available,
          availableSince: now,
          currentServiceOrderId: null,
          createdAt: now,
          updatedAt: now,
          deletedAt: null,
        }),
      ).toThrow();
    });
  });

  describe('equals', () => {
    it('is equal to another mechanic with the same id', () => {
      const a = makeMechanic();
      const b = makeMechanic();

      expect(a.equals(b)).toBe(false);

      const restored = Mechanic.restore({
        id: a.getId(),
        userId: null,
        name: a.getName(),
        cpf: a.getCpf(),
        email: a.getEmail(),
        phone: a.getPhone(),
        specialties: a.getSpecialties(),
        hireDate: a.getHireDate(),
        availability: a.getAvailability(),
        availableSince: a.getAvailableSince(),
        currentServiceOrderId: a.getCurrentServiceOrderId(),
        createdAt: a.getCreatedAt(),
        updatedAt: a.getUpdatedAt(),
        deletedAt: a.getDeletedAt(),
      });

      expect(a.equals(restored)).toBe(true);
    });
  });

  describe('toPrimitives', () => {
    it('returns the full primitive shape', () => {
      const mechanic = makeMechanic();

      const primitives = mechanic.toPrimitives();

      expect(primitives).toEqual({
        id: mechanic.getId(),
        userId: 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
        name: 'John Doe',
        cpf: '11144477735',
        email: 'john.doe@example.com',
        phone: {
          countryCode: '55',
          areaCode: '11',
          number: '912345678',
        },
        specialties: ['mechanical', 'electrical'],
        hireDate: validProps.hireDate,
        availability: MECHANIC_AVAILABILITY.Available,
        availableSince: mechanic.getAvailableSince(),
        currentServiceOrderId: null,
        createdAt: mechanic.getCreatedAt(),
        updatedAt: mechanic.getUpdatedAt(),
        deletedAt: null,
      });
    });
  });
});
