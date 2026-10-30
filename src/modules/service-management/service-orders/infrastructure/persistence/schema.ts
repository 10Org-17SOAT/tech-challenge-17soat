import { sql } from 'drizzle-orm';
import {
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uuid,
  varchar,
} from 'drizzle-orm/pg-core';
import { vehiclesTable } from '../../../../onboarding/vehicles/infrastructure/persistence/vehicle.schema';
import { services } from '../../../services/infrastructure/persistence/schema';
import { ORDER_STATUSES } from '../../domain/service-order.entity';

export const serviceOrderStatusEnum = pgEnum(
  'service_order_status',
  ORDER_STATUSES,
);

export const serviceOrders = pgTable(
  'service_orders',
  {
    id: uuid('service_order_id').primaryKey(),
    // Which car came in. The customer is derived from it, never stored here:
    // one owner column per fact, and the vehicle already owns that one.
    vehicleId: uuid('vehicle_id')
      .notNull()
      .references(() => vehiclesTable.vehicle_id),
    // Snapshot, not a FK: the order must stay truthful about who opened it
    // even if that consultant is later renamed or deleted, the same pattern
    // as `performed_by` on the stock ledger (see stock_movements).
    openedById: uuid('opened_by_id').notNull(),
    openedByName: varchar('opened_by_name', { length: 255 }).notNull(),
    status: serviceOrderStatusEnum('status').notNull().default('received'),
    approvedByCustomer: boolean('approved_by_customer')
      .notNull()
      .default(false),
    notes: text('notes'),
    vehicleMileageAtEntry: integer('vehicle_mileage_at_entry'),
    scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
    startedAt: timestamp('started_at', { withTimezone: true }),
    completedAt: timestamp('completed_at', { withTimezone: true }),
    // Stamped by the payment context's event handler: paying is what delivers
    // the car, so there is no separate "handed over" moment to record.
    deliveredAt: timestamp('delivered_at', { withTimezone: true }),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('service_orders_vehicle_id_idx').on(table.vehicleId),
    // The average-execution-time report scans a `completed_at` range; the
    // status and soft-delete filters ride along as cheap residuals.
    index('service_orders_completed_at_idx').on(table.completedAt),
  ],
);

// The scope of work an order carries: catalogue services, with the parts each
// one consumes derived from `service_supplies` at quotation time. There is no
// standalone part line — every part reaches an order through a service.
export const serviceItems = pgTable(
  'service_items',
  {
    serviceOrderId: uuid('service_order_id').notNull(),
    serviceId: uuid('service_id')
      .notNull()
      .references(() => services.id),
    quantity: integer('quantity').notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.serviceOrderId, table.serviceId] }),
    // Named explicitly: the convention-generated name would exceed Postgres'
    // 63-character identifier limit and be silently truncated.
    foreignKey({
      columns: [table.serviceOrderId],
      foreignColumns: [serviceOrders.id],
      name: 'service_items_service_order_id_fk',
    }),
    check('service_items_quantity_positive', sql`${table.quantity} > 0`),
  ],
);

// What the customer asked for when the order was opened — services from the
// catalogue and parts from stock. A request, not the scope of work: the
// diagnosis turns it into `service_items`, and only the quotation reserves
// stock. Parts carry no FK to `supplies`: that table belongs to the stock
// module, and quotation lines keep the same distance.
export const requestedServices = pgTable(
  'service_order_requested_services',
  {
    serviceOrderId: uuid('service_order_id').notNull(),
    serviceId: uuid('service_id').notNull(),
    quantity: integer('quantity').notNull(),
  },
  // Every constraint is named: the generated names would run past Postgres'
  // 63-character identifier limit on these table names.
  (table) => [
    primaryKey({
      name: 'requested_services_pk',
      columns: [table.serviceOrderId, table.serviceId],
    }),
    foreignKey({
      columns: [table.serviceOrderId],
      foreignColumns: [serviceOrders.id],
      name: 'requested_services_service_order_id_fk',
    }),
    foreignKey({
      columns: [table.serviceId],
      foreignColumns: [services.id],
      name: 'requested_services_service_id_fk',
    }),
    check('requested_services_quantity_positive', sql`${table.quantity} > 0`),
  ],
);

export const requestedParts = pgTable(
  'service_order_requested_parts',
  {
    serviceOrderId: uuid('service_order_id').notNull(),
    supplyId: uuid('supply_id').notNull(),
    quantity: integer('quantity').notNull(),
  },
  (table) => [
    primaryKey({
      name: 'requested_parts_pk',
      columns: [table.serviceOrderId, table.supplyId],
    }),
    foreignKey({
      columns: [table.serviceOrderId],
      foreignColumns: [serviceOrders.id],
      name: 'requested_parts_service_order_id_fk',
    }),
    check('requested_parts_quantity_positive', sql`${table.quantity} > 0`),
  ],
);
