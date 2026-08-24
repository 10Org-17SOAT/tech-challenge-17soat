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
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('stock_movements_supply_id_idx').on(table.supplyId),
    check('stock_movements_quantity_positive', sql`${table.quantity} > 0`),
    check(
      'stock_movements_type_valid',
      sql`${table.type} in ('IN', 'RESERVE', 'CONSUME')`,
    ),
  ],
);
