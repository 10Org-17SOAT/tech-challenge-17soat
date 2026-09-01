import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import {
  DATABASE_CONNECTION,
  type DrizzleDatabase,
} from '../../../../shared/config/database';
import { customersTable } from '../infrastructure/persistence/customer.schema';
import type {
  CustomerContact,
  CustomerContactQuery,
} from './customer-contact.query';

/**
 * Reads the table directly instead of going through CustomerRepository: this
 * is a projection, not the aggregate. Rebuilding a `Customer` — with its
 * Document, Phone and Address value objects — only to read two fields off it
 * would fail on legacy rows the entity no longer accepts, for no gain.
 */
@Injectable()
export class DrizzleCustomerContactQuery implements CustomerContactQuery {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findById(id: string): Promise<CustomerContact | null> {
    const rows = await this.db
      .select({
        id: customersTable.id,
        name: customersTable.name,
        tradeName: customersTable.tradeName,
        corporateName: customersTable.corporateName,
        email: customersTable.email,
      })
      .from(customersTable)
      .where(and(eq(customersTable.id, id), isNull(customersTable.deletedAt)))
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    return {
      id: row.id,
      // A company has no `name`; it is addressed by the name it trades under.
      name: row.name ?? row.tradeName ?? row.corporateName ?? '',
      email: row.email,
    };
  }

  async findIdByUserId(userId: string): Promise<string | null> {
    const rows = await this.db
      .select({ id: customersTable.id })
      .from(customersTable)
      .where(
        and(
          eq(customersTable.userId, userId),
          isNull(customersTable.deletedAt),
        ),
      )
      .limit(1);

    return rows[0]?.id ?? null;
  }
}
