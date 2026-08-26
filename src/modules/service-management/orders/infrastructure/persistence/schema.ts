import {
  boolean,
  integer,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { ORDER_STATUSES } from '../../domain/order.entity';

export const orderStatusEnum = pgEnum('order_status', ORDER_STATUSES);

export const orders = pgTable('orders', {
  id: uuid('order_id').primaryKey(),
  status: orderStatusEnum('status').notNull().default('received'),
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
