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

export interface MechanicRepository {
  save(mechanic: Mechanic): Promise<Mechanic>;
  updateProfile(id: string, mechanic: Mechanic): Promise<Mechanic | null>;
  findById(id: string): Promise<Mechanic | null>;
  findMany(params: FindMechanicsParams): Promise<PaginatedResult<Mechanic>>;
  claimIfAvailable(filter: ClaimFilter): Promise<Mechanic | null>;
  releaseIfAllocated(
    mechanicId: string,
    serviceOrderId: string,
  ): Promise<Mechanic | null>;
  deactivateIfNotAllocated(id: string): Promise<Mechanic | null>;
}

export const MECHANIC_REPOSITORY = Symbol('MECHANIC_REPOSITORY');