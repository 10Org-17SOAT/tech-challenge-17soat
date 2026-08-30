import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { SERVICE_CATEGORIES } from '../../domain/service.entity';

export const serviceCategoryEnum = pgEnum(
  'service_category',
  SERVICE_CATEGORIES,
);

export const services = pgTable(
  'services',
  {
    id: uuid('service_id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: serviceCategoryEnum('category').notNull(),
    laborPriceInCents: integer('labor_price_in_cents').notNull(),
    estimatedDuration: integer('estimated_duration'),
    warrantyDays: integer('warranty_days'),
    active: boolean('active').notNull().default(true),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    uniqueIndex('services_name_active_unique')
      .on(table.name)
      .where(sql`${table.deletedAt} is null`),
  ],
);

// A service's bill of materials. `supply_id` is a bare uuid, never a foreign
// key: `supplies` belongs to the stock module, and service-management reaches
// it only through stock's published contract. Same stance the stock ledger
// already takes with `service_order_reference`.
export const serviceSupplies = pgTable(
  'service_supplies',
  {
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    supplyId: uuid('supply_id').notNull(),
    quantity: integer('quantity').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.serviceId, table.supplyId] }),
    check('service_supplies_quantity_positive', sql`${table.quantity} > 0`),
  ],
);
