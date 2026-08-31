import { sql } from 'drizzle-orm';
import {
  check,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  uuid,
} from 'drizzle-orm/pg-core';

// `service_order_reference` is deliberately not a foreign key: payment is a
// separate bounded context from service-management, the same stance stock
// takes with its own `service_order_reference` column. The unique index is
// what guarantees a service order is never charged twice.
export const payments = pgTable(
  'payments',
  {
    id: uuid('payment_id').primaryKey(),
    serviceOrderReference: uuid('service_order_reference').notNull(),
    // Snapshot of the order's total at the moment it was charged — never
    // re-read from the quotation afterward, same reasoning as
    // `quotation_items.unit_price_in_cents`.
    amountInCents: integer('amount_in_cents').notNull(),
    paidAt: timestamp('paid_at', { withTimezone: true }).notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    uniqueIndex('payments_service_order_reference_unique').on(
      table.serviceOrderReference,
    ),
    check('payments_amount_in_cents_positive', sql`${table.amountInCents} > 0`),
  ],
);
