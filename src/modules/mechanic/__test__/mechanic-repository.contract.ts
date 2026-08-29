import { randomUUID } from 'node:crypto';
import { Mechanic } from '../domain/mechanic.entity';
import { Cpf } from '../domain/value-objects/cpf.value-object';
import { Email } from '../domain/value-objects/email.value-object';
import { Phone } from '../domain/value-objects/phone.value-object';
import { DuplicateCpfException } from '../domain/exceptions/mechanic.exceptions';
import {
  MECHANIC_AVAILABILITY,
  type MechanicAvailability,
} from '../domain/value-objects/mechanic-availability.enum';
import type { Specialty } from '../domain/value-objects/specialty.enum';
import type { MechanicRepository } from '../domain/repository/mechanic.repository';

export interface MechanicRepositoryContext {
  repository: MechanicRepository;
}

// Generates VALID CPFs (same mod-11 algorithm as the Cpf value object).
const checkDigit = (digits: string, weights: number[]): number => {
  const sum = weights.reduce(
    (acc, weight, index) => acc + Number(digits[index]) * weight,
    0,
  );
  const remainder = sum % 11;
  return remainder < 2 ? 0 : 11 - remainder;
};

const validCpf = (base9: string): string => {
  const d1 = checkDigit(base9, [10, 9, 8, 7, 6, 5, 4, 3, 2]);
  const d2 = checkDigit(base9 + d1, [11, 10, 9, 8, 7, 6, 5, 4, 3, 2]);
  return `${base9}${d1}${d2}`;
};

const makeMechanic = (overrides?: {
  id?: string;
  name?: string;
  cpf?: string;
  specialties?: Specialty[];
  availability?: MechanicAvailability;
  availableSince?: Date;
}): Mechanic => {
  const now = new Date();
  const availability = overrides?.availability ?? MECHANIC_AVAILABILITY.Available;
  const availableSince = overrides?.availableSince ?? now;

  const mechanic = Mechanic.restore({
    id: overrides?.id ?? randomUUID(),
    name: overrides?.name ?? 'John Doe',
    cpf: new Cpf(overrides?.cpf ?? validCpf('111444777')),
    email: new Email('john.doe@example.com'),
    phone: new Phone({
      countryCode: '55',
      areaCode: '11',
      number: '912345678',
    }),
    specialties: overrides?.specialties ?? ['mechanical'],
    hireDate: new Date('2024-01-15T00:00:00.000Z'),
    availability,
    availableSince,
    currentServiceOrderId:
      availability === MECHANIC_AVAILABILITY.Allocated ? 'OS-0' : null,
    createdAt: availableSince,
    updatedAt: now,
    deletedAt: availability === MECHANIC_AVAILABILITY.Inactive ? now : null,
  });

  return mechanic;
};

/**
 * Behaviour every MechanicRepository must satisfy, whatever the storage.
 * Shared by the in-memory fake (unit) and the Drizzle adapter (e2e) so the
 * fake can never drift from the real state-machine semantics — availability
 * integrity is critical.
 */
export function describeMechanicRepositoryContract(
  makeContext: () => Promise<MechanicRepositoryContext>,
): void {
  let context: MechanicRepositoryContext;
  let repository: MechanicRepository;

  beforeEach(async () => {
    context = await makeContext();
    repository = context.repository;
  });

  describe('save', () => {
    it('persists and returns the mechanic', async () => {
      const mechanic = makeMechanic();

      const saved = await repository.save(mechanic);

      expect(saved.getId()).toBe(mechanic.getId());
      expect(await repository.findById(mechanic.getId())).not.toBeNull();
    });

    it('rejects a duplicate active CPF', async () => {
      const first = makeMechanic({ cpf: '11144477735' });
      await repository.save(first);

      const second = makeMechanic({ cpf: '11144477735' });

      await expect(repository.save(second)).rejects.toBeInstanceOf(
        DuplicateCpfException,
      );
    });

    it('allows re-registration of a deactivated CPF', async () => {
      const first = makeMechanic({ cpf: '11144477735' });
      await repository.save(first);
      await repository.deactivateIfNotAllocated(first.getId());

      const second = makeMechanic({ cpf: '11144477735' });

      await expect(repository.save(second)).resolves.not.toBeNull();
    });
  });

  describe('findById', () => {
    it('returns an active mechanic', async () => {
      const mechanic = makeMechanic();
      await repository.save(mechanic);

      const found = await repository.findById(mechanic.getId());

      expect(found?.getId()).toBe(mechanic.getId());
    });

    it('returns null for an unknown id', async () => {
      await expect(
        repository.findById('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
      ).resolves.toBeNull();
    });

    it('returns null for a deactivated mechanic', async () => {
      const mechanic = makeMechanic();
      await repository.save(mechanic);
      await repository.deactivateIfNotAllocated(mechanic.getId());

      await expect(repository.findById(mechanic.getId())).resolves.toBeNull();
    });
  });

  describe('updateProfile', () => {
    it('updates and returns the mechanic', async () => {
      const mechanic = makeMechanic();
      await repository.save(mechanic);
      mechanic.updateProfile({ name: 'Jane Doe' });

      const updated = await repository.updateProfile(
        mechanic.getId(),
        mechanic,
      );

      expect(updated?.getName()).toBe('Jane Doe');
    });

    it('returns null for an unknown id', async () => {
      const mechanic = makeMechanic();

      await expect(
        repository.updateProfile(
          'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11',
          mechanic,
        ),
      ).resolves.toBeNull();
    });
  });

  describe('findMany', () => {
    it('returns a paginated result with metadata', async () => {
      await repository.save(makeMechanic());
      await repository.save(
        makeMechanic({ cpf: validCpf('529982247') }),
      );

      const result = await repository.findMany({ page: 1, limit: 10 });

      expect(result.total).toBe(2);
      expect(result.data).toHaveLength(2);
      expect(result.totalPages).toBe(1);
    });

    it('filters by name case-insensitively (partial match)', async () => {
      await repository.save(makeMechanic({ name: 'John Doe' }));
      await repository.save(
        makeMechanic({ name: 'Jane Doe', cpf: validCpf('529982247') }),
      );

      const result = await repository.findMany({
        page: 1,
        limit: 10,
        filters: { name: 'john' },
      });

      expect(result.total).toBe(1);
      expect(result.data[0].getName()).toBe('John Doe');
    });

    it('filters by specialty', async () => {
      await repository.save(makeMechanic({ specialties: ['mechanical'] }));
      await repository.save(
        makeMechanic({
          cpf: validCpf('529982247'),
          specialties: ['electrical'],
        }),
      );

      const result = await repository.findMany({
        page: 1,
        limit: 10,
        filters: { specialty: 'electrical' },
      });

      expect(result.total).toBe(1);
      expect(result.data[0].getSpecialties()).toEqual(['electrical']);
    });

    it('filters by availability', async () => {
      await repository.save(makeMechanic());
      await repository.save(
        makeMechanic({
          cpf: validCpf('529982247'),
          availability: MECHANIC_AVAILABILITY.Allocated,
        }),
      );

      const result = await repository.findMany({
        page: 1,
        limit: 10,
        filters: { availability: MECHANIC_AVAILABILITY.Allocated },
      });

      expect(result.total).toBe(1);
    });

    it('excludes deactivated mechanics', async () => {
      const mechanic = makeMechanic();
      await repository.save(mechanic);
      await repository.deactivateIfNotAllocated(mechanic.getId());

      const result = await repository.findMany({ page: 1, limit: 10 });

      expect(result.total).toBe(0);
    });
  });

  describe('claimIfAvailable', () => {
    it('claims the mechanic with the oldest availableSince (FIFO)', async () => {
      const older = makeMechanic({
        availableSince: new Date('2024-01-01T00:00:00.000Z'),
      });
      const newer = makeMechanic({
        cpf: validCpf('529982247'),
        availableSince: new Date('2024-02-01T00:00:00.000Z'),
      });
      await repository.save(older);
      await repository.save(newer);

      const claimed = await repository.claimIfAvailable({
        serviceOrderId: 'OS-1',
      });

      expect(claimed?.getId()).toBe(older.getId());
      expect(claimed?.getAvailability()).toBe(
        MECHANIC_AVAILABILITY.Allocated,
      );
      expect(claimed?.getCurrentServiceOrderId()).toBe('OS-1');
    });

    it('respects the specialty filter', async () => {
      await repository.save(makeMechanic({ specialties: ['mechanical'] }));
      const electrical = makeMechanic({
        cpf: validCpf('529982247'),
        specialties: ['electrical'],
      });
      await repository.save(electrical);

      const claimed = await repository.claimIfAvailable({
        serviceOrderId: 'OS-1',
        specialty: 'electrical',
      });

      expect(claimed?.getId()).toBe(electrical.getId());
    });

    it('returns null when no mechanic is available', async () => {
      await repository.save(
        makeMechanic({ availability: MECHANIC_AVAILABILITY.Allocated }),
      );

      await expect(
        repository.claimIfAvailable({ serviceOrderId: 'OS-1' }),
      ).resolves.toBeNull();
    });

    it('accepts exactly one of two concurrent claims on a single mechanic', async () => {
      const mechanic = makeMechanic();
      await repository.save(mechanic);

      const results = await Promise.all([
        repository.claimIfAvailable({ serviceOrderId: 'OS-A' }),
        repository.claimIfAvailable({ serviceOrderId: 'OS-B' }),
      ]);

      const claimed = results.filter((r) => r !== null);
      const notClaimed = results.filter((r) => r === null);
      expect(claimed).toHaveLength(1);
      expect(notClaimed).toHaveLength(1);

      const stored = await repository.findById(mechanic.getId());
      expect(stored?.getAvailability()).toBe(
        MECHANIC_AVAILABILITY.Allocated,
      );
    });
  });

  describe('releaseIfAllocated', () => {
    it('releases a mechanic allocated to the matching order', async () => {
      const mechanic = makeMechanic({
        availability: MECHANIC_AVAILABILITY.Allocated,
      });
      await repository.save(mechanic);

      const released = await repository.releaseIfAllocated(
        mechanic.getId(),
        'OS-0',
      );

      expect(released?.getAvailability()).toBe(
        MECHANIC_AVAILABILITY.Available,
      );
      expect(released?.getCurrentServiceOrderId()).toBeNull();
    });

    it('returns null for a non-allocated mechanic', async () => {
      const mechanic = makeMechanic();
      await repository.save(mechanic);

      await expect(
        repository.releaseIfAllocated(mechanic.getId(), 'OS-1'),
      ).resolves.toBeNull();
    });

    it('returns null for a mismatched service order', async () => {
      const mechanic = makeMechanic({
        availability: MECHANIC_AVAILABILITY.Allocated,
      });
      await repository.save(mechanic);

      await expect(
        repository.releaseIfAllocated(mechanic.getId(), 'OS-other'),
      ).resolves.toBeNull();
    });
  });

  describe('deactivateIfNotAllocated', () => {
    it('deactivates a non-allocated mechanic', async () => {
      const mechanic = makeMechanic();
      await repository.save(mechanic);

      const deactivated = await repository.deactivateIfNotAllocated(
        mechanic.getId(),
      );

      expect(deactivated?.getAvailability()).toBe(
        MECHANIC_AVAILABILITY.Inactive,
      );
      expect(deactivated?.getDeletedAt()).toBeInstanceOf(Date);
    });

    it('returns null for an allocated mechanic', async () => {
      const mechanic = makeMechanic({
        availability: MECHANIC_AVAILABILITY.Allocated,
      });
      await repository.save(mechanic);

      await expect(
        repository.deactivateIfNotAllocated(mechanic.getId()),
      ).resolves.toBeNull();
    });
  });
}