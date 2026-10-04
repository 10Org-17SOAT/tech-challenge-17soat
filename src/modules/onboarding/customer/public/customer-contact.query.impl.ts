import { Inject, Injectable } from '@nestjs/common';
import { and, eq, isNull } from 'drizzle-orm';
import { UserRole } from '../../../auth/roles/role.enum';
import { users } from '../../../auth/infrastructure/persistence/schema';
import {
  DATABASE_CONNECTION,
  type DrizzleDatabase,
} from '../../../../shared/config/database';
import { CustomerAttributesSchema } from '../domain/customer-attributes.schema';
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
        id: users.user_id,
        name: users.name,
        email: users.email,
        attributes: users.attributes,
      })
      .from(users)
      .where(
        and(
          eq(users.user_id, id),
          eq(users.role_id, UserRole.CUSTOMER),
          isNull(users.deleted_at),
        ),
      )
      .limit(1);

    const row = rows[0];
    if (!row) return null;

    const attributes = CustomerAttributesSchema.parse(row.attributes);
    return {
      id: row.id,
      name: attributes.tradeName ?? attributes.corporateName ?? row.name ?? '',
      email: row.email,
    };
  }

  async findIdByUserId(userId: string): Promise<string | null> {
    const rows = await this.db
      .select({ id: users.user_id })
      .from(users)
      .where(
        and(
          eq(users.user_id, userId),
          eq(users.role_id, UserRole.CUSTOMER),
          isNull(users.deleted_at),
        ),
      )
      .limit(1);

    return rows[0]?.id ?? null;
  }
}
