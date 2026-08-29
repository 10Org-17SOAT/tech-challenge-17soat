import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, ilike, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '@/shared/config/database/database.constants';
import type { DrizzleDatabase } from '@/shared/config/database/drizzle.provider';
import { SupplyNameAlreadyExistsError } from '@/modules/stock/domain/errors/supply-name-already-exists.error';
import { Supply } from '@/modules/stock/domain/supply.entity';
import type {
  ListSuppliesFilter,
  PaginatedSupplies,
  SupplyRepository,
} from '@/modules/stock/domain/supply.repository';
import { supplies } from '@/modules/stock/infrastructure/persistence/schema';

const PG_UNIQUE_VIOLATION = '23505';

type SupplyRow = typeof supplies.$inferSelect;

function toEntity(row: SupplyRow): Supply {
  return Supply.restore(row);
}

@Injectable()
export class DrizzleSupplyRepository implements SupplyRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findById(id: string): Promise<Supply | null> {
    const rows = await this.db
      .select()
      .from(supplies)
      .where(and(eq(supplies.id, id), isNull(supplies.deletedAt)))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByName(name: string): Promise<Supply | null> {
    const rows = await this.db
      .select()
      .from(supplies)
      .where(and(eq(supplies.name, name), isNull(supplies.deletedAt)))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findMany({
    page,
    limit,
    name,
  }: ListSuppliesFilter): Promise<PaginatedSupplies> {
    // The same predicate feeds both queries so `total` matches the filtered page.
    const where = and(
      isNull(supplies.deletedAt),
      name ? ilike(supplies.name, `%${name}%`) : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(supplies)
        .where(where)
        .orderBy(supplies.createdAt, supplies.id)
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(supplies).where(where),
    ]);
    return { items: rows.map(toEntity), total };
  }

  async save(supply: Supply): Promise<void> {
    const row: SupplyRow = {
      id: supply.id,
      name: supply.name,
      description: supply.description,
      priceInCents: supply.priceInCents,
      createdAt: supply.createdAt,
      updatedAt: supply.updatedAt,
      deletedAt: supply.deletedAt,
    };

    try {
      await this.db
        .insert(supplies)
        .values(row)
        .onConflictDoUpdate({ target: supplies.id, set: row });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new SupplyNameAlreadyExistsError(supply.name, { cause: error });
      }
      throw error;
    }
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  return (
    candidate.code === PG_UNIQUE_VIOLATION || isUniqueViolation(candidate.cause)
  );
}
