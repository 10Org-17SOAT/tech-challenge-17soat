import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { ORDER_STATUSES } from '../../domain/service-order.entity';

export const serviceOrderStatusEnum = pgEnum('service_order_status', ORDER_STATUSES);

export const serviceOrders = pgTable('service_orders', {
  id: uuid('service_order_id').primaryKey(),
  status: serviceOrderStatusEnum('status').notNull().default('received'),
  approvedByCustomer: boolean('approved_by_customer').notNull().default(false),
  notes: text('notes'),
  vehicleMileageAtEntry: integer('vehicle_mileage_at_entry'),
  scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
  startedAt: timestamp('started_at', { withTimezone: true }),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
});
