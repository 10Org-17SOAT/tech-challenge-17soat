import { Mechanic } from '../domain/mechanic.entity';
import { DuplicateCpfException } from '../domain/exceptions/mechanic.exceptions';
import { MECHANIC_AVAILABILITY } from '../domain/value-objects/mechanic-availability.enum';
import type { Specialty } from '../domain/value-objects/specialty.enum';
import type {
  ClaimFilter,
  FindMechanicsParams,
  MechanicRepository,
  PaginatedResult,
} from '../domain/repository/mechanic.repository';

/**
 * In-memory fake replicating the Drizzle adapter semantics for tests.
 *
 * Atomicity: no `await` between the eligibility check and the mutation — the
 * whole check runs in one microtask, so two Promise.all'd claims on the same
 * mechanic can never interleave; exactly one succeeds. The same guarantee the
 * Drizzle adapter gets from `FOR UPDATE SKIP LOCKED` (precedent:
 * InMemoryStockMovementRepository).
 */
export class InMemoryMechanicRepository implements MechanicRepository {
  readonly mechanics = new Map<string, Mechanic>();

  save(mechanic: Mechanic): Promise<Mechanic> {
    const cpf = mechanic.getCpf().getValue();

    const activeHolder = [...this.mechanics.values()].find(
      (candidate) =>
        candidate.getId() !== mechanic.getId() &&
        candidate.getCpf().getValue() === cpf &&
        candidate.getDeletedAt() === null,
    );

    if (activeHolder) {
      return Promise.reject(new DuplicateCpfException(cpf));
    }

    this.mechanics.set(mechanic.getId(), mechanic);
    return Promise.resolve(mechanic);
  }

  updateProfile(id: string, mechanic: Mechanic): Promise<Mechanic | null> {
    const existing = this.mechanics.get(id);
    if (existing === undefined || existing.getDeletedAt() !== null) {
      return Promise.resolve(null);
    }

    this.mechanics.set(id, mechanic);
    return Promise.resolve(mechanic);
  }

  findById(id: string): Promise<Mechanic | null> {
    const mechanic = this.mechanics.get(id);
    const isActive = mechanic !== undefined && mechanic.getDeletedAt() === null;
    return Promise.resolve(isActive ? mechanic : null);
  }

  findMany(params: FindMechanicsParams): Promise<PaginatedResult<Mechanic>> {
    const { page, limit, filters } = params;

    const active = [...this.mechanics.values()]
      .filter((mechanic) => mechanic.getDeletedAt() === null)
      .filter((mechanic) => {
        if (!filters) {
          return true;
        }
        if (
          filters.name &&
          !mechanic
            .getName()
            .toLowerCase()
            .includes(filters.name.toLowerCase())
        ) {
          return false;
        }
        if (
          filters.specialty &&
          !mechanic.getSpecialties().includes(filters.specialty)
        ) {
          return false;
        }
        if (
          filters.availability &&
          mechanic.getAvailability() !== filters.availability
        ) {
          return false;
        }
        return true;
      })
      .sort((a, b) => {
        const byDate = a.getCreatedAt().getTime() - b.getCreatedAt().getTime();
        return byDate !== 0 ? byDate : a.getId().localeCompare(b.getId());
      });

    const total = active.length;

    return Promise.resolve({
      data: active.slice((page - 1) * limit, page * limit),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    });
  }

  // Atomic claim: eligibility check, FIFO selection, and mutation all run in
  // one microtask (no await between them).
  claimIfAvailable(filter: ClaimFilter): Promise<Mechanic | null> {
    const candidates = [...this.mechanics.values()]
      .filter(
        (mechanic) =>
          mechanic.getDeletedAt() === null &&
          mechanic.getAvailability() === MECHANIC_AVAILABILITY.Available &&
          (filter.specialty === undefined ||
            mechanic.getSpecialties().includes(filter.specialty as Specialty)),
      )
      .sort(
        (a, b) =>
          a.getAvailableSince().getTime() - b.getAvailableSince().getTime(),
      );

    const candidate = candidates[0];
    if (candidate === undefined) {
      return Promise.resolve(null);
    }

    candidate.claim(filter.serviceOrderId);
    return Promise.resolve(candidate);
  }

  // Atomic release: eligibility check and mutation in one microtask.
  releaseIfAllocated(
    mechanicId: string,
    serviceOrderId: string,
  ): Promise<Mechanic | null> {
    const mechanic = this.mechanics.get(mechanicId);
    if (
      mechanic === undefined ||
      mechanic.getDeletedAt() !== null ||
      mechanic.getAvailability() !== MECHANIC_AVAILABILITY.Allocated ||
      mechanic.getCurrentServiceOrderId() !== serviceOrderId
    ) {
      return Promise.resolve(null);
    }

    mechanic.release(serviceOrderId);
    return Promise.resolve(mechanic);
  }

  // Atomic deactivation: eligibility check and mutation in one microtask.
  deactivateIfNotAllocated(id: string): Promise<Mechanic | null> {
    const mechanic = this.mechanics.get(id);
    if (
      mechanic === undefined ||
      mechanic.getDeletedAt() !== null ||
      mechanic.getAvailability() === MECHANIC_AVAILABILITY.Allocated
    ) {
      return Promise.resolve(null);
    }

    mechanic.deactivate();
    return Promise.resolve(mechanic);
  }
}