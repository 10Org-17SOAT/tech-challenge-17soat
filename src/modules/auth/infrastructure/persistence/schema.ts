import { sql } from 'drizzle-orm';
import {
  customType,
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

/**
 * `pg` already parses jsonb into JS values, but Drizzle's `jsonb()` runs
 * `JSON.parse` again on any string it gets back. A phone stored as the JSON
 * string "11987654321" would then come out as the number 11987654321.
 */
const parsedJsonb = customType<{ data: unknown; driverData: unknown }>({
  dataType: () => 'jsonb',
  toDriver: (value) => JSON.stringify(value),
});

export const roles = pgTable('roles', {
  role_id: integer('role_id').primaryKey(),
  name: varchar('name', { length: 32 }).notNull().unique(),
});

export const users = pgTable(
  'users',
  {
    user_id: uuid('user_id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    password_hash: varchar('password_hash', { length: 255 }).notNull(),
    document: varchar('document', { length: 14 }),
    phone: parsedJsonb('phone'),
    role_id: integer('role_id')
      .notNull()
      .references(() => roles.role_id),
    attributes: jsonb('attributes')
      .$type<Record<string, unknown>>()
      .notNull()
      .default({}),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('users_document_active_unique')
      .on(table.document)
      .where(
        sql`${table.document} IS NOT NULL AND ${table.deleted_at} IS NULL`,
      ),
    index('users_attributes_gin_idx').using('gin', table.attributes),
  ],
);
