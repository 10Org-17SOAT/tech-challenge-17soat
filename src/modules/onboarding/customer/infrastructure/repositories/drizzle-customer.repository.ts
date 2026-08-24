import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import { Customer } from '../../domain/customer.entity';
import {
  type CustomerRepository,
  type FindAllParams,
  type PaginatedResult,
} from '../../domain/repository/customer.repository';
import { DuplicateDocumentException } from '../../domain/exceptions/customer.exceptions';
import { customersTable } from '../persistence/customer.schema';
import { CustomerMapper } from '../mappers/customer.mapper';

const PG_UNIQUE_VIOLATION = '23505';

@Injectable()
export class DrizzleCustomerRepository implements CustomerRepository {
  constructor(
    @Inject(DATABASE_CONNECTION)
    private readonly db: DrizzleDatabase,
  ) {}

  async save(customer: Customer): Promise<Customer> {
    const row = CustomerMapper.toPersistence(customer);

    try {
      await this.db
        .insert(customersTable)
        .values(row)
        .onConflictDoUpdate({ target: customersTable.id, set: row });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new DuplicateDocumentException(row.document, { cause: error });
      }
      throw error;
    }

    return customer;
  }

  async findById(id: string): Promise<Customer | null> {
    const rows = await this.db
      .select()
      .from(customersTable)
      .where(and(eq(customersTable.id, id), isNull(customersTable.deletedAt)))
      .limit(1);

    return rows[0] ? CustomerMapper.toDomain(rows[0]) : null;
  }

  async findByDocument(document: string): Promise<Customer | null> {
    const rows = await this.db
      .select()
      .from(customersTable)
      .where(
        and(
          eq(customersTable.document, document),
          isNull(customersTable.deletedAt),
        ),
      )
      .limit(1);

    return rows[0] ? CustomerMapper.toDomain(rows[0]) : null;
  }

  async findAll(params: FindAllParams): Promise<PaginatedResult<Customer>> {
    const { page, limit, filters } = params;
    const conditions = [isNull(customersTable.deletedAt)];

    if (filters?.personType) {
      conditions.push(eq(customersTable.personType, filters.personType));
    }
    if (filters?.name) {
      conditions.push(ilike(customersTable.name, `%${filters.name}%`));
    }
    if (filters?.document) {
      conditions.push(eq(customersTable.document, filters.document));
    }
    if (filters?.email) {
      conditions.push(eq(customersTable.email, filters.email));
    }

    const where = and(...conditions);

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(customersTable)
        .where(where)
        .orderBy(asc(customersTable.createdAt), asc(customersTable.id))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(customersTable).where(where),
    ]);

    const total = countRows[0]?.total ?? 0;

    return {
      data: rows.map((row) => CustomerMapper.toDomain(row)),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async delete(id: string): Promise<void> {
    await this.db
      .update(customersTable)
      .set({ deletedAt: new Date(), updatedAt: new Date() })
      .where(and(eq(customersTable.id, id), isNull(customersTable.deletedAt)));
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
