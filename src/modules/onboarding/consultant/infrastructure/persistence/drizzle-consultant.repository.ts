import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, ilike, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import { ConsultantCpfAlreadyExistsError } from '../../domain/errors/consultant-cpf-already-exists.error';
import { Consultant } from '../../domain/consultant.entity';
import type {
  ListConsultantsFilter,
  PaginatedConsultants,
  ConsultantRepository,
} from '../../domain/consultant.repository';
import { consultants } from './schema';

const PG_UNIQUE_VIOLATION = '23505';

type ConsultantRow = typeof consultants.$inferSelect;

function toEntity(row: ConsultantRow): Consultant {
  return Consultant.restore(row);
}

@Injectable()
export class DrizzleConsultantRepository implements ConsultantRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findById(id: string): Promise<Consultant | null> {
    const rows = await this.db
      .select()
      .from(consultants)
      .where(and(eq(consultants.id, id), isNull(consultants.deletedAt)))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByCpf(cpf: string): Promise<Consultant | null> {
    const rows = await this.db
      .select()
      .from(consultants)
      .where(and(eq(consultants.cpf, cpf), isNull(consultants.deletedAt)))
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
      isNull(consultants.deletedAt),
      name ? ilike(consultants.name, `%${name}%`) : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(consultants)
        .where(where)
        .orderBy(consultants.createdAt, consultants.id)
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(consultants).where(where),
    ]);
    return { items: rows.map(toEntity), total };
  }

  async save(consultant: Consultant): Promise<void> {
    const row: ConsultantRow = {
      id: consultant.id,
      userId: consultant.userId,
      name: consultant.name,
      cpf: consultant.cpf,
      phone: consultant.phone,
      createdAt: consultant.createdAt,
      updatedAt: consultant.updatedAt,
      deletedAt: consultant.deletedAt,
    };

    try {
      await this.db
        .insert(consultants)
        .values(row)
        .onConflictDoUpdate({ target: consultants.id, set: row });
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
