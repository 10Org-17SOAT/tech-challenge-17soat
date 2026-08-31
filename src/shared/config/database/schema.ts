export * from '../../../modules/onboarding/customer/infrastructure/persistence/customer.schema';
export * from '../../../modules/onboarding/consultant/infrastructure/persistence/schema';
// Aggregator for drizzle-kit: each module owns its own tables.
export * from '../../../modules/service-management/services/infrastructure/persistence/schema';
export * from '../../../modules/stock/infrastructure/persistence/schema';
export * from '../../../modules/mechanic/infrastructure/persistence/mechanic.schema';
export { vehiclesTable } from '../../../modules/onboarding/vehicles/infrastructure/persistence/vehicle.schema';
export * from '../../../modules/service-management/service-orders/infrastructure/persistence/schema';
export * from '../../../modules/service-management/diagnostics/infrastructure/persistence/schema';
export * from '../../../modules/service-management/quotations/infrastructure/persistence/schema';
