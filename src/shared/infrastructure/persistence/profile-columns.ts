import { users } from '../../../modules/auth/infrastructure/persistence/schema';
import { timestamp, uuid, varchar } from 'drizzle-orm/pg-core';

export function profileColumns(idColumnName: string) {
  return {
    id: uuid(idColumnName).primaryKey(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.user_id, {
        onDelete: 'cascade' as const,
      }),
    name: varchar('name', { length: 255 }).notNull(),
    cpf: varchar('cpf', { length: 11 }).notNull(),
    phone: varchar('phone', { length: 11 }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  };
}
