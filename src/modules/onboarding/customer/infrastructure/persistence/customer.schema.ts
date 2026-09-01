import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { AddressProps } from '../../domain/value-objects/address.value-object';
import type { PhoneProps } from '../../domain/value-objects/phone.value-object';

// No FK to auth's `users` table: user_id is validated at the domain layer
// instead, keeping this module's schema free of any import from auth's
// infrastructure (modular monolith boundary — no cross-context FK).
export const customersTable = pgTable(
  'customers',
  {
    id: uuid('customer_id').primaryKey().defaultRandom(),
    userId: uuid('user_id'),
    personType: varchar('person_type', { length: 10 }).notNull(),
    document: varchar('document', { length: 14 }).notNull(),
    name: varchar('name', { length: 255 }),
    corporateName: varchar('corporate_name', { length: 255 }),
    tradeName: varchar('trade_name', { length: 255 }),
    email: varchar('email', { length: 255 }).notNull(),
    phone: jsonb('phone').$type<PhoneProps>().notNull(),
    address: jsonb('address').$type<AddressProps>().notNull(),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('customers_document_active_unique')
      .on(table.document)
      .where(sql`${table.deletedAt} IS NULL`),
    index('customers_email_idx').on(table.email),
    index('customers_deleted_at_idx').on(table.deletedAt),
  ],
);
