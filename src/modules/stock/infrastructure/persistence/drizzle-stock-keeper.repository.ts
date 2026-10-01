import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, ilike, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../shared/config/database/drizzle.provider';
import { UserRole } from '../../../auth/roles/role.enum';
import { users } from '../../../auth/infrastructure/persistence/schema';
import { StockKeeperCpfAlreadyExistsError } from '../../domain/errors/stock-keeper-cpf-already-exists.error';
import { StockKeeper } from '../../domain/stock-keeper.entity';
import type {
  ListStockKeepersFilter,
  PaginatedStockKeepers,
  StockKeeperRepository,
} from '../../domain/stock-keeper.repository';

const PG_UNIQUE_VIOLATION = '23505';

type StockKeeperRow = typeof users.$inferSelect;

function toEntity(row: StockKeeperRow): StockKeeper {
  if (row.document === null || typeof row.phone !== 'string') {
    throw new Error('Stock keeper user is missing a document or phone.');
  }
  return StockKeeper.restore({
    id: row.user_id,
    userId: row.user_id,
    name: row.name,
    cpf: row.document,
    phone: row.phone,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    deletedAt: row.deleted_at,
  });
}

@Injectable()
export class DrizzleStockKeeperRepository implements StockKeeperRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findById(id: string): Promise<StockKeeper | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.user_id, id),
          eq(users.role_id, UserRole.STOCK_KEEPER),
          isNull(users.deleted_at),
        ),
      )
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByCpf(cpf: string): Promise<StockKeeper | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.document, cpf),
          eq(users.role_id, UserRole.STOCK_KEEPER),
          isNull(users.deleted_at),
        ),
      )
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
      eq(users.role_id, UserRole.STOCK_KEEPER),
      isNull(users.deleted_at),
      name ? ilike(users.name, `%${name}%`) : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .orderBy(users.created_at, users.user_id)
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(users).where(where),
    ]);
    return { items: rows.map(toEntity), total };
  }

  async save(stockKeeper: StockKeeper): Promise<void> {
    try {
      const [updated] = await this.db
        .update(users)
        .set({
          name: stockKeeper.name,
          document: stockKeeper.cpf,
          phone: stockKeeper.phone,
          updated_at: stockKeeper.updatedAt,
          deleted_at: stockKeeper.deletedAt,
        })
        .where(
          and(
            eq(users.user_id, stockKeeper.userId),
            eq(users.role_id, UserRole.STOCK_KEEPER),
          ),
        )
        .returning({ id: users.user_id });
      if (!updated) {
        throw new Error(
          'Stock keeper user does not exist or has another role.',
        );
      }
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
