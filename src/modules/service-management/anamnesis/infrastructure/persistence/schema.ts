import {
  boolean,
  index,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from 'drizzle-orm/pg-core';
import { serviceOrders } from '../../../service-orders/infrastructure/persistence/schema';
import {
  FREQUENCIES,
  HOW_STARTED,
  SEVERITIES,
} from '../../domain/anamnesis.entity';

export const anamnesisHowStartedEnum = pgEnum(
  'anamnesis_how_started',
  HOW_STARTED,
);
export const anamnesisFrequencyEnum = pgEnum(
  'anamnesis_frequency',
  FREQUENCIES,
);
export const anamnesisSeverityEnum = pgEnum(
  'anamnesis_severity',
  SEVERITIES,
);

// One anamnesis per service order: the customer's account of the problem,
// captured at reception and locked once the order leaves "received".
export const anamneses = pgTable(
  'anamneses',
  {
    id: uuid('anamnesis_id').primaryKey(),
    serviceOrderId: uuid('service_order_id')
      .notNull()
      .unique()
      .references(() => serviceOrders.id),
    consultantId: uuid('consultant_id').notNull(),
    updatedBy: uuid('updated_by'),
    mainComplaint: text('main_complaint').notNull(),
    problemDescription: text('problem_description').notNull(),
    problemStartedAt: text('problem_started_at'),
    howStarted: anamnesisHowStartedEnum('how_started'),
    evolution: text('evolution'),
    occurrenceConditions: text('occurrence_conditions'),
    frequency: anamnesisFrequencyEnum('frequency'),
    severity: anamnesisSeverityEnum('severity'),
    previousOccurrences: text('previous_occurrences'),
    recentMaintenance: text('recent_maintenance'),
    warningLights: boolean('warning_lights'),
    unusualNoisesSmells: text('unusual_noises_smells'),
    behaviorChanges: text('behavior_changes'),
    usageConditions: text('usage_conditions'),
    customerObservations: text('customer_observations'),
    createdAt: timestamp('created_at', { withTimezone: true }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true }).notNull(),
    deletedAt: timestamp('deleted_at', { withTimezone: true }),
  },
  (table) => [
    index('idx_anamneses_service_order_id').on(table.serviceOrderId),
  ],
);