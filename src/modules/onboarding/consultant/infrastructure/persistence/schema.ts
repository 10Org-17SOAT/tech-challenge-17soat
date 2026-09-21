import { sql } from 'drizzle-orm';
import {
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../../../../auth/infrastructure/persistence/schema';

// A consultant is a profile specialization of an authenticated user.
export const consultants = pgTable(
  'consultants',
  {
    id: uuid('consultant_id').primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.user_id, {
        onDelete: 'cascade',
      }),
    name: varchar('name', { length: 255 }).notNull(),
    cpf: varchar('cpf', { length: 11 }).notNull(),
    phone: varchar('phone', { length: 11 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    // CPF uniqueness applies only to active consultants (soft delete frees it)
    uniqueIndex('consultants_cpf_active_unique')
      .on(table.cpf)
      .where(sql`${table.deletedAt} is null`),
    uniqueIndex('consultants_user_active_unique')
      .on(table.userId)
      .where(sql`${table.deletedAt} is null`),
  ],
);
