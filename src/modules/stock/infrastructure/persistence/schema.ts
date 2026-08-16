import { sql } from 'drizzle-orm';
import {
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
    id: uuid('id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    priceInCents: integer('price_in_cents').notNull(),
    quantity: integer('quantity').notNull().default(0),
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
