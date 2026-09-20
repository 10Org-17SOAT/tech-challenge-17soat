import { sql } from 'drizzle-orm';
import {
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

// Stock keepers are the profile of the employees who operate this context,
// mirroring how `customers` is its own profile table in Atendimento: no
// cross-context FK, including to the platform-wide `users` table — user_id
// is validated at the domain layer instead, keeping this module's schema
// free of any import from auth's infrastructure (modular monolith boundary).
export const stockKeepers = pgTable(
  'stock_keepers',
  {
    id: uuid('stock_keeper_id').primaryKey(),
    userId: uuid('user_id'),
    name: varchar('name', { length: 255 }).notNull(),
    cpf: varchar('cpf', { length: 11 }).notNull(),
    phone: varchar('phone', { length: 11 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    // CPF uniqueness applies only to active stock keepers (soft delete frees it)
    uniqueIndex('stock_keepers_cpf_active_unique')
      .on(table.cpf)
      .where(sql`${table.deletedAt} is null`),
  ],
);
