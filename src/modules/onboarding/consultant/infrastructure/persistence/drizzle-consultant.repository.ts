import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, ilike, isNull } from 'drizzle-orm';
import { UserRole } from '../../../../auth/roles/role.enum';
import { users } from '../../../../auth/infrastructure/persistence/schema';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import { ConsultantCpfAlreadyExistsError } from '../../domain/errors/consultant-cpf-already-exists.error';
import { Consultant } from '../../domain/consultant.entity';
import type {
  ListConsultantsFilter,
  PaginatedConsultants,
  ConsultantRepository,
} from '../../domain/consultant.repository';

const PG_UNIQUE_VIOLATION = '23505';

type ConsultantRow = typeof users.$inferSelect;

function toEntity(row: ConsultantRow): Consultant {
  if (row.document === null || typeof row.phone !== 'string') {
    throw new Error('Consultant user is missing a document or phone.');
  }
  return Consultant.restore({
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
export class DrizzleConsultantRepository implements ConsultantRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findById(id: string): Promise<Consultant | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.user_id, id),
          eq(users.role_id, UserRole.CONSULTANT),
          isNull(users.deleted_at),
        ),
      )
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByCpf(cpf: string): Promise<Consultant | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.document, cpf),
          eq(users.role_id, UserRole.CONSULTANT),
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
  }: ListConsultantsFilter): Promise<PaginatedConsultants> {
    // The same predicate feeds both queries so `total` matches the filtered page.
    const where = and(
      eq(users.role_id, UserRole.CONSULTANT),
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

  async save(consultant: Consultant): Promise<void> {
    try {
      const [updated] = await this.db
        .update(users)
        .set({
          name: consultant.name,
          document: consultant.cpf,
          phone: consultant.phone,
          updated_at: consultant.updatedAt,
          deleted_at: consultant.deletedAt,
        })
        .where(
          and(
            eq(users.user_id, consultant.userId),
            eq(users.role_id, UserRole.CONSULTANT),
          ),
        )
        .returning({ id: users.user_id });
      if (!updated) {
        throw new Error('Consultant user does not exist or has another role.');
      }
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ConsultantCpfAlreadyExistsError(consultant.cpf, {
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
