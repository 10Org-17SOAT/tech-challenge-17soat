import { sql } from 'drizzle-orm';
import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';

export const serviceCategoryEnum = pgEnum('service_category', [
  'mechanical',
  'electrical',
  'bodywork',
  'painting',
  'tire',
  'glass',
  'upholstery',
  'air_conditioning',
  'inspection',
  'other',
]);

export const services = pgTable(
  'services',
  {
    id: uuid('service_id').primaryKey(),
    name: varchar('name', { length: 255 }).notNull(),
    description: text('description'),
    category: serviceCategoryEnum('category').notNull(),
    priceInCents: integer('price_in_cents').notNull(),
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
