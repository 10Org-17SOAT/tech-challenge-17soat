import { Inject, Injectable } from '@nestjs/common';
import { and, asc, count, eq, ilike, isNull, sql } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import { UserRole } from '../../../../auth/roles/role.enum';
import { users } from '../../../../auth/infrastructure/persistence/schema';
import { Customer } from '../../domain/customer.entity';
import {
  type CustomerRepository,
  type FindAllParams,
  type PaginatedResult,
} from '../../domain/repository/customer.repository';
import { DuplicateDocumentException } from '../../domain/exceptions/customer.exceptions';
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
      const [updated] = await this.db
        .update(users)
        .set({
          name: row.name,
          email: row.email,
          document: row.document,
          phone: row.phone,
          attributes: row.attributes,
          updated_at: row.updated_at,
          deleted_at: row.deleted_at,
        })
        .where(
          and(
            eq(users.user_id, row.user_id),
            eq(users.role_id, UserRole.CUSTOMER),
          ),
        )
        .returning({ id: users.user_id });
      if (!updated) {
        throw new Error('Customer user does not exist or has another role.');
      }
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
      .from(users)
      .where(
        and(
          eq(users.user_id, id),
          eq(users.role_id, UserRole.CUSTOMER),
          isNull(users.deleted_at),
        ),
      )
      .limit(1);

    return rows[0] ? CustomerMapper.toDomain(rows[0]) : null;
  }

  async findByDocument(document: string): Promise<Customer | null> {
    const rows = await this.db
      .select()
      .from(users)
      .where(
        and(
          eq(users.document, document),
          eq(users.role_id, UserRole.CUSTOMER),
          isNull(users.deleted_at),
        ),
      )
      .limit(1);

    return rows[0] ? CustomerMapper.toDomain(rows[0]) : null;
  }

  async findAll(params: FindAllParams): Promise<PaginatedResult<Customer>> {
    const { page, limit, filters } = params;
    const conditions = [
      eq(users.role_id, UserRole.CUSTOMER),
      isNull(users.deleted_at),
    ];

    if (filters?.personType) {
      conditions.push(
        sql`${users.attributes}->>'personType' = ${filters.personType}`,
      );
    }
    if (filters?.name) {
      conditions.push(
        ilike(
          sql`coalesce(${users.attributes}->>'tradeName', ${users.attributes}->>'corporateName', ${users.name})`,
          `%${filters.name}%`,
        ),
      );
    }
    if (filters?.document) {
      conditions.push(eq(users.document, filters.document));
    }
    if (filters?.email) {
      conditions.push(eq(users.email, filters.email));
    }

    const where = and(...conditions);

    const [rows, countRows] = await Promise.all([
      this.db
        .select()
        .from(users)
        .where(where)
        .orderBy(asc(users.created_at), asc(users.user_id))
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(users).where(where),
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
      .update(users)
      .set({ deleted_at: new Date(), updated_at: new Date() })
      .where(
        and(
          eq(users.user_id, id),
          eq(users.role_id, UserRole.CUSTOMER),
          isNull(users.deleted_at),
        ),
      );
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
