import { Mechanic } from '../mechanic.entity';
import type { Specialty } from '../value-objects/specialty.enum';
import type { MechanicAvailability } from '../value-objects/mechanic-availability.enum';

export interface ClaimFilter {
  serviceOrderId: string;
  specialty?: Specialty;
}

export interface FindMechanicsFilters {
  name?: string;
  specialty?: Specialty;
  availability?: MechanicAvailability;
}

export interface FindMechanicsParams {
  page: number;
  limit: number;
  filters?: FindMechanicsFilters;
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

/**
 * Discriminated outcome of `deactivateIfNotAllocated`. The plain `null` could
 * not distinguish "allocated" from "not found / already deactivated", which
 * made the use case map both to 409 (false 409 on the find-then-update race).
 */
export type DeactivateResult =
  | { status: 'deactivated' }
  | { status: 'not-found' }
  | { status: 'allocated' };

/**
 * Mechanic persistence contract.
 *
 * The transition methods (`claimIfAvailable`, `releaseIfAllocated`,
 * `deactivateIfNotAllocated`) are the **production source of truth** for the
 * availability state machine: they must execute the transition atomically in
 * the storage (conditional UPDATE with row locking) so concurrent claims and
 * releases stay safe. The entity methods (`Mechanic.claim()`, `release()`,
 * `deactivate()`) are reference semantics for the in-memory fake and test
 * seeding only.
 *
 * Parity between the two is enforced by the repository contract test
 * (`__test__/mechanic-repository.contract.ts`), which runs against both the
 * fake and the Drizzle adapter.
 */
export interface MechanicRepository {
  save(mechanic: Mechanic): Promise<Mechanic>;
  updateProfile(mechanic: Mechanic): Promise<Mechanic | null>;
  findById(id: string): Promise<Mechanic | null>;
  /**
   * The mechanic acting as a given auth account, for proving that a caller is
   * who they claim. `null` when no active mechanic is linked to it — `user_id`
   * is nullable, so an account may have no profile at all.
   */
  findByUserId(userId: string): Promise<Mechanic | null>;
  findMany(params: FindMechanicsParams): Promise<PaginatedResult<Mechanic>>;
  claimIfAvailable(filter: ClaimFilter): Promise<Mechanic | null>;
  releaseIfAllocated(
    mechanicId: string,
    serviceOrderId: string,
  ): Promise<Mechanic | null>;
  deactivateIfNotAllocated(id: string): Promise<DeactivateResult>;
}

export const MECHANIC_REPOSITORY = Symbol('MECHANIC_REPOSITORY');
