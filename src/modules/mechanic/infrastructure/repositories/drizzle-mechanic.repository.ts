import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, exists, ilike, isNull, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../shared/config/database/drizzle.provider';
import { UserRole } from '../../../auth/roles/role.enum';
import { users } from '../../../auth/infrastructure/persistence/schema';
import { Mechanic } from '../../domain/mechanic.entity';
import {
  type ClaimFilter,
  type DeactivateResult,
  type FindMechanicsParams,
  type MechanicRepository,
  type PaginatedResult,
} from '../../domain/repository/mechanic.repository';
import { DuplicateCpfException } from '../../domain/exceptions/mechanic.exceptions';
import { MECHANIC_AVAILABILITY } from '../../domain/value-objects/mechanic-availability.enum';
import { mechanicAvailability } from '../persistence/mechanic.schema';
import { MechanicMapper } from '../mappers/mechanic.mapper';
import {
  mechanicProfileSelection,
  mechanicSelection,
} from '../mappers/mechanic.mapper';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class DrizzleMechanicRepository implements MechanicRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: DrizzleDatabase,
  ) {}

  async save(mechanic: Mechanic): Promise<Mechanic> {
    const row = MechanicMapper.toPersistence(mechanic);

    try {
      await this.db.transaction(async (tx) => {
        const [updatedProfile] = await tx
          .update(users)
          .set(row.profile)
          .where(
            and(
              eq(users.user_id, mechanic.getUserId()),
              eq(users.role_id, UserRole.MECHANIC),
            ),
          )
          .returning({ id: users.user_id });
        if (!updatedProfile) {
          throw new Error('Mechanic user does not exist or has another role.');
        }
        await tx
          .insert(mechanicAvailability)
          .values(row.availability)
          .onConflictDoUpdate({
            target: mechanicAvailability.userId,
            set: {
              availability: row.availability.availability,
              availableSince: row.availability.availableSince,
              currentServiceOrderId: row.availability.currentServiceOrderId,
            },
          });
      });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateCpfException(mechanic.getCpf().getValue(), {
          cause: error,
        });
      }
      throw error;
    }

    return mechanic;
  }

  async findById(id: string): Promise<Mechanic | null> {
    const rows = await this.db
      .select(mechanicSelection)
      .from(users)
      .innerJoin(
        mechanicAvailability,
        eq(mechanicAvailability.userId, users.user_id),
      )
      .where(
        and(
          eq(users.user_id, id),
          eq(users.role_id, UserRole.MECHANIC),
          isNull(users.deleted_at),
        ),
      )
      .limit(1);

    return rows[0] ? MechanicMapper.toDomain(rows[0]) : null;
  }

  async findByUserId(userId: string): Promise<Mechanic | null> {
    return this.findById(userId);
  }

  async updateProfile(mechanic: Mechanic): Promise<Mechanic | null> {
    const row = MechanicMapper.toPersistence(mechanic);

    const [updated] = await this.db
      .update(users)
      .set(row.profile)
      .where(
        and(
          eq(users.user_id, mechanic.getUserId()),
          eq(users.role_id, UserRole.MECHANIC),
          isNull(users.deleted_at),
        ),
      )
      .returning({ id: users.user_id });

    if (!updated) return null;
    return mechanic;
  }

  async findMany(
    params: FindMechanicsParams,
  ): Promise<PaginatedResult<Mechanic>> {
    const { page, limit, filters } = params;
    const conditions = [
      eq(users.role_id, UserRole.MECHANIC),
      isNull(users.deleted_at),
    ];

    if (filters?.name) {
      conditions.push(ilike(users.name, `%${filters.name}%`));
    }
    if (filters?.specialty) {
      conditions.push(
        sql`${users.attributes} @> ${JSON.stringify({
          specialties: [filters.specialty],
        })}::jsonb`,
      );
    }
    if (filters?.availability) {
      conditions.push(
        eq(mechanicAvailability.availability, filters.availability),
      );
    }

    const where = and(...conditions);

    const [rows, countRows] = await Promise.all([
      this.db
        .select(mechanicSelection)
        .from(users)
        .innerJoin(
          mechanicAvailability,
          eq(mechanicAvailability.userId, users.user_id),
        )
        .where(where)
        .orderBy(asc(mechanicAvailability.availableSince), asc(users.user_id))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ total: count() })
        .from(users)
        .innerJoin(
          mechanicAvailability,
          eq(mechanicAvailability.userId, users.user_id),
        )
        .where(where),
    ]);

    const total = countRows[0]?.total ?? 0;

    return {
      data: rows.map((row) => MechanicMapper.toDomain(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  // Atomic claim: selects exactly one candidate by FIFO (oldest availableSince),
  // optionally filtered by specialty, and transitions it to ALLOCATED. The
  // FOR UPDATE SKIP LOCKED row lock serializes concurrent claims on the same
  // mechanic — exactly one wins, the rest skip it and pick another (or none).
  async claimIfAvailable(filter: ClaimFilter): Promise<Mechanic | null> {
    return this.db.transaction(async (tx) => {
      const conditions = [
        eq(mechanicAvailability.availability, MECHANIC_AVAILABILITY.Available),
        exists(
          tx
            .select({ one: sql`1` })
            .from(users)
            .where(
              and(
                eq(users.user_id, mechanicAvailability.userId),
                eq(users.role_id, UserRole.MECHANIC),
                isNull(users.deleted_at),
                filter.specialty === undefined
                  ? undefined
                  : sql`${users.attributes} @> ${JSON.stringify({
                      specialties: [filter.specialty],
                    })}::jsonb`,
              ),
            ),
        ),
      ];

      const [candidate] = await tx
        .select()
        .from(mechanicAvailability)
        .where(and(...conditions))
        .orderBy(
          asc(mechanicAvailability.availableSince),
          asc(mechanicAvailability.userId),
        )
        .limit(1)
        .for('update', { skipLocked: true });

      if (!candidate) {
        return null;
      }

      const [claimed] = await tx
        .update(mechanicAvailability)
        .set({
          availability: MECHANIC_AVAILABILITY.Allocated,
          currentServiceOrderId: filter.serviceOrderId,
        })
        .where(eq(mechanicAvailability.userId, candidate.userId))
        .returning();

      if (!claimed) return null;
      const [profile] = await tx
        .select(mechanicProfileSelection)
        .from(users)
        .where(
          and(
            eq(users.user_id, candidate.userId),
            eq(users.role_id, UserRole.MECHANIC),
            isNull(users.deleted_at),
          ),
        )
        .limit(1);
      return profile
        ? MechanicMapper.toDomain({ ...profile, ...claimed })
        : null;
    });
  }

  // Atomic release: conditional update prevents releasing a mechanic no longer
  // allocated to the given order (release-vs-claim race).
  async releaseIfAllocated(
    mechanicId: string,
    serviceOrderId: string,
  ): Promise<Mechanic | null> {
    const released = await this.db
      .update(mechanicAvailability)
      .set({
        availability: MECHANIC_AVAILABILITY.Available,
        availableSince: new Date(),
        currentServiceOrderId: null,
      })
      .where(
        and(
          eq(mechanicAvailability.userId, mechanicId),
          eq(
            mechanicAvailability.availability,
            MECHANIC_AVAILABILITY.Allocated,
          ),
          eq(mechanicAvailability.currentServiceOrderId, serviceOrderId),
          exists(
            this.db
              .select({ one: sql`1` })
              .from(users)
              .where(
                and(
                  eq(users.user_id, mechanicAvailability.userId),
                  eq(users.role_id, UserRole.MECHANIC),
                  isNull(users.deleted_at),
                ),
              ),
          ),
        ),
      )
      .returning();

    return released[0] ? this.findById(mechanicId) : null;
  }

  // Atomic deactivation: conditional update prevents deactivating a mechanic
  // claimed in between (deactivate-vs-claim race). When the update touches 0
  // rows, a follow-up SELECT distinguishes "allocated" from "not found /
  // already deactivated" so the use case can map them to 409 and 404.
  async deactivateIfNotAllocated(
    mechanicId: string,
  ): Promise<DeactivateResult> {
    const deactivated = await this.db.transaction(async (tx) => {
      const now = new Date();
      const rows = await tx
        .update(mechanicAvailability)
        .set({ availability: MECHANIC_AVAILABILITY.Inactive })
        .where(
          and(
            eq(mechanicAvailability.userId, mechanicId),
            sql`${mechanicAvailability.availability} != ${MECHANIC_AVAILABILITY.Allocated}`,
            exists(
              tx
                .select({ one: sql`1` })
                .from(users)
                .where(
                  and(
                    eq(users.user_id, mechanicAvailability.userId),
                    eq(users.role_id, UserRole.MECHANIC),
                    isNull(users.deleted_at),
                  ),
                ),
            ),
          ),
        )
        .returning();
      if (rows[0]) {
        await tx
          .update(users)
          .set({ deleted_at: now, updated_at: now })
          .where(eq(users.user_id, mechanicId));
      }
      return rows;
    });

    if (deactivated[0]) {
      return { status: 'deactivated' };
    }

    const mechanic = await this.findById(mechanicId);
    if (!mechanic) {
      return { status: 'not-found' };
    }

    return { status: 'allocated' };
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const candidate = error as { code?: unknown; cause?: unknown };
  return (
    candidate.code === PG_UNIQUE_VIOLATION || isUniqueViolation(candidate.cause)
  );
}
