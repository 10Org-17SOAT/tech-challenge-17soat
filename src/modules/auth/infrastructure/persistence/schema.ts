import { integer, pgTable, uuid, varchar } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  user_id: uuid('user_id').primaryKey(),
  name: varchar('name', { length: 255 }).notNull(),
  email: varchar('email', { length: 255 }).notNull(),
  password_hash: varchar('password_hash', { length: 255 }).notNull(),
  role_id: integer('role_id').notNull(),
});
