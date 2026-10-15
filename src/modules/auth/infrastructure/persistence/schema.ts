import { sql } from 'drizzle-orm';
import {
  index,
  integer,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

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
    phone: jsonb('phone').$type<unknown>(),
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
