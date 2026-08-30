import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, ilike, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../shared/config/database/drizzle.provider';
import { StockKeeperCpfAlreadyExistsError } from '../../domain/errors/stock-keeper-cpf-already-exists.error';
import { StockKeeper } from '../../domain/stock-keeper.entity';
import type {
  ListStockKeepersFilter,
  PaginatedStockKeepers,
  StockKeeperRepository,
} from '../../domain/stock-keeper.repository';
import { stockKeepers } from './schema';

const PG_UNIQUE_VIOLATION = '23505';

type StockKeeperRow = typeof stockKeepers.$inferSelect;

function toEntity(row: StockKeeperRow): StockKeeper {
  return StockKeeper.restore(row);
}

@Injectable()
export class DrizzleStockKeeperRepository implements StockKeeperRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findById(id: string): Promise<StockKeeper | null> {
    const rows = await this.db
      .select()
      .from(stockKeepers)
      .where(and(eq(stockKeepers.id, id), isNull(stockKeepers.deletedAt)))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByCpf(cpf: string): Promise<StockKeeper | null> {
    const rows = await this.db
      .select()
      .from(stockKeepers)
      .where(and(eq(stockKeepers.cpf, cpf), isNull(stockKeepers.deletedAt)))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findMany({
    page,
    limit,
    name,
  }: ListStockKeepersFilter): Promise<PaginatedStockKeepers> {
    // The same predicate feeds both queries so `total` matches the filtered page.
    const where = and(
      isNull(stockKeepers.deletedAt),
      name ? ilike(stockKeepers.name, `%${name}%`) : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(stockKeepers)
        .where(where)
        .orderBy(stockKeepers.createdAt, stockKeepers.id)
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(stockKeepers).where(where),
    ]);
    return { items: rows.map(toEntity), total };
  }

  async save(stockKeeper: StockKeeper): Promise<void> {
    const row: StockKeeperRow = {
      id: stockKeeper.id,
      name: stockKeeper.name,
      cpf: stockKeeper.cpf,
      phone: stockKeeper.phone,
      createdAt: stockKeeper.createdAt,
      updatedAt: stockKeeper.updatedAt,
      deletedAt: stockKeeper.deletedAt,
    };

    try {
      await this.db
        .insert(stockKeepers)
        .values(row)
        .onConflictDoUpdate({ target: stockKeepers.id, set: row });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new StockKeeperCpfAlreadyExistsError(stockKeeper.cpf, {
          cause: error,
        });
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
