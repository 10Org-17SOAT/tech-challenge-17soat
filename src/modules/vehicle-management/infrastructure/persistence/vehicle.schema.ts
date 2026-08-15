import {
  pgTable,
  text,
  integer,
  uuid,
  timestamp,
  varchar,
  index,
} from 'drizzle-orm/pg-core';

export const vehiclesTable = pgTable(
  'vehicles',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    licensePlate: varchar('license_plate', { length: 20 }).unique().notNull(),
    model: varchar('model', { length: 100 }).notNull(),
    year: integer('year').notNull(),
    manufacturer: varchar('manufacturer', { length: 100 }).notNull(),
    description: text('description'),
    color: varchar('color', { length: 50 }).notNull(),
    fuelType: varchar('fuel_type', { length: 20 }).notNull(), // GASOLINE, ETHANOL, DIESEL, HYBRID
    odometer: integer('odometer').notNull().default(0),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at')
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => ({
    licensePlateIdx: index('idx_license_plate').on(table.licensePlate),
    fuelTypeIdx: index('idx_fuel_type').on(table.fuelType),
  }),
);
