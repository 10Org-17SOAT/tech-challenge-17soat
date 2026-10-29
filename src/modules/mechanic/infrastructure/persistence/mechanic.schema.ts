import { sql } from 'drizzle-orm';
import {
  check,
  index,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { users } from '../../../auth/infrastructure/persistence/schema';

export const mechanicAvailability = pgTable(
  'mechanic_availability',
  {
    userId: uuid('user_id')
      .notNull()
      .primaryKey()
      .references(() => users.user_id, {
        onDelete: 'cascade',
      }),
    availability: varchar('availability', { length: 16 }).notNull(),
    availableSince: timestamp('available_since', {
      withTimezone: true,
    }).notNull(),
    currentServiceOrderId: varchar('current_service_order_id', {
      length: 255,
    }),
  },
  (table) => [
    index('mechanic_availability_fifo_idx').on(
      table.availability,
      table.availableSince,
    ),
    check(
      'mechanic_availability_valid',
      sql`${table.availability} in ('AVAILABLE', 'ALLOCATED', 'OFF_DUTY', 'INACTIVE')`,
    ),
  ],
);
