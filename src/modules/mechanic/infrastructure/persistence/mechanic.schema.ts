import { sql } from 'drizzle-orm';
import {
  check,
  index,
  jsonb,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import type { PhoneProps } from '../../domain/value-objects/phone.value-object';
import type { Specialty } from '../../domain/value-objects/specialty.enum';

export const mechanicsTable = pgTable(
  'mechanics',
  {
    id: uuid('mechanic_id').primaryKey().defaultRandom(),
    name: varchar('name', { length: 255 }).notNull(),
    cpf: varchar('cpf', { length: 11 }).notNull(),
    email: varchar('email', { length: 255 }).notNull(),
    phone: jsonb('phone').$type<PhoneProps>().notNull(),
    specialties: jsonb('specialties').$type<Specialty[]>().notNull(),
    hireDate: timestamp('hire_date', { withTimezone: true }).notNull(),
    availability: varchar('availability', { length: 16 }).notNull(),
    availableSince: timestamp('available_since', {
      withTimezone: true,
    }).notNull(),
    currentServiceOrderId: varchar('current_service_order_id', {
      length: 255,
    }),
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
    // CPF uniqueness applies only to active mechanics (soft delete frees the CPF)
    uniqueIndex('mechanics_cpf_active_unique')
      .on(table.cpf)
      .where(sql`${table.deletedAt} IS NULL`),
    // Access path for the FIFO claim query (availability, available_since)
    index('mechanics_availability_available_since_idx').on(
      table.availability,
      table.availableSince,
    ),
    index('mechanics_deleted_at_idx').on(table.deletedAt),
    check(
      'mechanics_availability_valid',
      sql`${table.availability} in ('AVAILABLE', 'ALLOCATED', 'OFF_DUTY', 'INACTIVE')`,
    ),
  ],
);
