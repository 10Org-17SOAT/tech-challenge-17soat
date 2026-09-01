import { sql } from 'drizzle-orm';
import {
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../../../auth/infrastructure/persistence/schema';

export const supplies = pgTable(
  'supplies',
  {
    id: uuid('supply_id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    priceInCents: integer('price_in_cents').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    // Name uniqueness applies only to active supplies (soft delete frees the name)
    uniqueIndex('supplies_name_active_unique')
      .on(table.name)
      .where(sql`${table.deletedAt} is null`),
  ],
);

// Stock keepers are the profile of the employees who operate this context,
// mirroring how `customers` is its own profile table in Atendimento: no
// cross-context FK other than the nullable link to the platform-wide
// `users` table (a stock keeper may exist without a login yet).
export const stockKeepers = pgTable(
  'stock_keepers',
  {
    id: uuid('stock_keeper_id').primaryKey(),
    userId: uuid('user_id').references(() => users.user_id),
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

// The stock ledger: quantity is never a column on `supplies`, it is always
// derived from these append-only entries.
export const stockMovements = pgTable(
  'stock_movements',
  {
    id: uuid('movement_id').primaryKey(),
    supplyId: uuid('supply_id')
      .notNull()
      .references(() => supplies.id),
    type: varchar('type', { length: 16 }).notNull(),
    quantity: integer('quantity').notNull(),
    serviceOrderReference: varchar('service_order_reference', { length: 255 }),
    // Snapshot, not a FK: the ledger must stay truthful even if the stock
    // keeper is later renamed or deleted. Required only for IN movements —
    // RESERVE/CONSUME are triggered by the Service Order, not by a person.
    performedById: uuid('performed_by_id'),
    performedByName: varchar('performed_by_name', { length: 255 }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('stock_movements_supply_id_idx').on(table.supplyId),
    check('stock_movements_quantity_positive', sql`${table.quantity} > 0`),
    check(
      'stock_movements_type_valid',
      sql`${table.type} in ('IN', 'RESERVE', 'CONSUME')`,
    ),
    check(
      'stock_movements_in_requires_performer',
      sql`${table.type} <> 'IN' or ${table.performedById} is not null`,
    ),
  ],
);
