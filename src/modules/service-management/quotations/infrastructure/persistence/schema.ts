import {
  check,
  index,
  integer,
  pgEnum,
  pgTable,
  uniqueIndex,
  uuid,
  varchar,
  timestamp,
} from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { serviceOrders } from '../../../service-orders/infrastructure/persistence/schema';
import {
  QUOTATION_ITEM_KINDS,
  QUOTATION_STATUSES,
} from '../../domain/quotation.entity';

export const quotationStatusEnum = pgEnum(
  'quotation_status',
  QUOTATION_STATUSES,
);

export const quotationItemKindEnum = pgEnum(
  'quotation_item_kind',
  QUOTATION_ITEM_KINDS,
);

export const quotations = pgTable(
  'quotations',
  {
    id: uuid('quotation_id').primaryKey(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .references(() => serviceOrders.id),
    status: quotationStatusEnum('status').notNull().default('issued'),
    issuedAt: timestamp('issued_at', { withTimezone: true }).notNull(),
    approvedAt: timestamp('approved_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    // One quotation per service order. Rejection is out of scope, so there is
    // no "live vs superseded" distinction to scope this index to yet.
    uniqueIndex('quotations_service_order_unique').on(table.serviceOrderId),
  ],
);

// The frozen lines of a quotation. `reference_id` points at the catalogue row
// the line came from (a service or a supply) for traceability only — it is
// deliberately not a foreign key, and price is never re-read through it.
export const quotationItems = pgTable(
  'quotation_items',
  {
    id: uuid('quotation_item_id').primaryKey(),
    quotationId: uuid('quotation_id')
      .notNull()
      .references(() => quotations.id, { onDelete: 'cascade' }),
    kind: quotationItemKindEnum('kind').notNull(),
    referenceId: uuid('reference_id').notNull(),
    nameSnapshot: varchar('name_snapshot', { length: 255 }).notNull(),
    unitPriceInCents: integer('unit_price_in_cents').notNull(),
    quantity: integer('quantity').notNull(),
  },
  (table) => [
    index('quotation_items_quotation_id_idx').on(table.quotationId),
    check('quotation_items_quantity_positive', sql`${table.quantity} > 0`),
    check(
      'quotation_items_unit_price_non_negative',
      sql`${table.unitPriceInCents} >= 0`,
    ),
  ],
);
