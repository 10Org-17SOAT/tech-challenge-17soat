import { sql } from 'drizzle-orm';
import {
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Consultants are the profile of the employees who work the counter in
// Atendimento, mirroring how `customers` and the stock module's
// `stock_keepers` are each a self-contained profile table: no cross-context
// FK, including to the platform-wide `users` table — user_id is validated at
// the domain layer instead, keeping this module's schema free of any import
// from auth's infrastructure (modular monolith boundary).
export const consultants = pgTable(
  'consultants',
  {
    id: uuid('consultant_id').primaryKey(),
    userId: uuid('user_id'),
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
  ],
);
