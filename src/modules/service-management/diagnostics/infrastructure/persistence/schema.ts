import { index, pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import { serviceOrders } from '../../../service-orders/infrastructure/persistence/schema';

export const diagnostics = pgTable(
  'diagnostics',
  {
    id: uuid('diagnosis_id').primaryKey(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .references(() => serviceOrders.id),
    findings: text('findings').notNull(),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
  },
  (table) => [
    index('diagnostics_service_order_id_idx').on(table.serviceOrderId),
  ],
);
