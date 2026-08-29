import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, isNull, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../shared/config/database/drizzle.provider';
import { Mechanic } from '../../domain/mechanic.entity';
import {
  type ClaimFilter,
  type FindMechanicsParams,
  type MechanicRepository,
  type PaginatedResult,
} from '../../domain/repository/mechanic.repository';
import { DuplicateCpfException } from '../../domain/exceptions/mechanic.exceptions';
import { MECHANIC_AVAILABILITY } from '../../domain/value-objects/mechanic-availability.enum';
import { mechanicsTable } from '../persistence/mechanic.schema';
import { MechanicMapper } from '../mappers/mechanic.mapper';

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
      await this.db
        .insert(mechanicsTable)
        .values(row)
        .onConflictDoUpdate({ target: mechanicsTable.id, set: row });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateCpfException(row.cpf, { cause: error });
      }
      throw error;
    }

    return mechanic;
  }

  async findById(id: string): Promise<Mechanic | null> {
    const rows = await this.db
      .select()
      .from(mechanicsTable)
      .where(and(eq(mechanicsTable.id, id), isNull(mechanicsTable.deletedAt)))
      .limit(1);

    return rows[0] ? MechanicMapper.toDomain(rows[0]) : null;
  }

  async updateProfile(
    id: string,
    mechanic: Mechanic,
  ): Promise<Mechanic | null> {
    const row = MechanicMapper.toPersistence(mechanic);

    const updated = await this.db
      .update(mechanicsTable)
      .set({
        name: row.name,
        email: row.email,
        phone: row.phone,
        specialties: row.specialties,
        hireDate: row.hireDate,
        updatedAt: new Date(),
      })
      .where(and(eq(mechanicsTable.id, id), isNull(mechanicsTable.deletedAt)))
      .returning();

    return updated[0] ? MechanicMapper.toDomain(updated[0]) : null;
  }

  async findMany(params: FindMechanicsParams): Promise<PaginatedResult<Mechanic>> {
    const { page, limit, filters } = params;
    const conditions = [isNull(mechanicsTable.deletedAt)];

    if (filters?.name) {
      conditions.push(ilike(mechanicsTable.name, `%${filters.name}%`));
    }
    if (filters?.specialty) {
      conditions.push(
        sql`${mechanicsTable.specialties} @> ${JSON.stringify([
          filters.specialty,
        ])}::jsonb`,
      );
    }
    if (filters?.availability) {
      conditions.push(eq(mechanicsTable.availability, filters.availability));
    }

    const where = and(...conditions);

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(mechanicsTable)
        .where(where)
        .orderBy(asc(mechanicsTable.availableSince), asc(mechanicsTable.id))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(mechanicsTable).where(where),
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
        eq(mechanicsTable.availability, MECHANIC_AVAILABILITY.Available),
        isNull(mechanicsTable.deletedAt),
      ];
      if (filter.specialty !== undefined) {
        conditions.push(
          sql`${mechanicsTable.specialties} @> ${JSON.stringify([
            filter.specialty,
          ])}::jsonb`,
        );
      }

      const [candidate] = await tx
        .select()
        .from(mechanicsTable)
        .where(and(...conditions))
        .orderBy(asc(mechanicsTable.availableSince), asc(mechanicsTable.id))
        .limit(1)
        .for('update', { skipLocked: true });

      if (!candidate) {
        return null;
      }

      const [claimed] = await tx
        .update(mechanicsTable)
        .set({
          availability: MECHANIC_AVAILABILITY.Allocated,
          currentServiceOrderId: filter.serviceOrderId,
          updatedAt: new Date(),
        })
        .where(eq(mechanicsTable.id, candidate.id))
        .returning();

      return claimed ? MechanicMapper.toDomain(claimed) : null;
    });
  }

  // Atomic release: conditional update prevents releasing a mechanic no longer
  // allocated to the given order (release-vs-claim race).
  async releaseIfAllocated(
    mechanicId: string,
    serviceOrderId: string,
  ): Promise<Mechanic | null> {
    const released = await this.db
      .update(mechanicsTable)
      .set({
        availability: MECHANIC_AVAILABILITY.Available,
        availableSince: new Date(),
        currentServiceOrderId: null,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(mechanicsTable.id, mechanicId),
          eq(mechanicsTable.availability, MECHANIC_AVAILABILITY.Allocated),
          eq(mechanicsTable.currentServiceOrderId, serviceOrderId),
          isNull(mechanicsTable.deletedAt),
        ),
      )
      .returning();

    return released[0] ? MechanicMapper.toDomain(released[0]) : null;
  }

  // Atomic deactivation: conditional update prevents deactivating a mechanic
  // claimed in between (deactivate-vs-claim race).
  async deactivateIfNotAllocated(mechanicId: string): Promise<Mechanic | null> {
    const deactivated = await this.db
      .update(mechanicsTable)
      .set({
        availability: MECHANIC_AVAILABILITY.Inactive,
        deletedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(mechanicsTable.id, mechanicId),
          sql`${mechanicsTable.availability} != ${MECHANIC_AVAILABILITY.Allocated}`,
          isNull(mechanicsTable.deletedAt),
        ),
      )
      .returning();

    return deactivated[0] ? MechanicMapper.toDomain(deactivated[0]) : null;
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