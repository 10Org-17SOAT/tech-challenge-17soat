import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, inArray, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import { ServiceNameAlreadyExistsError } from '../../domain/errors/service-name-already-exists.error';
import { Service } from '../../domain/service.entity';
import {
  PaginatedServices,
  Pagination,
  ServiceRepository,
  ServiceSupply,
} from '../../domain/service.repository';
import { services, serviceSupplies } from './schema';

const PG_UNIQUE_VIOLATION = '23505';

type ServiceRow = typeof services.$inferSelect;

function toEntity(row: ServiceRow): Service {
  return Service.restore(row);
}

@Injectable()
export class DrizzleServiceRepository implements ServiceRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findById(id: string): Promise<Service | null> {
    const rows = await this.db
      .select()
      .from(services)
      .where(and(eq(services.id, id), isNull(services.deletedAt)))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findByName(name: string): Promise<Service | null> {
    const rows = await this.db
      .select()
      .from(services)
      .where(and(eq(services.name, name), isNull(services.deletedAt)))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findMany({ page, limit }: Pagination): Promise<PaginatedServices> {
    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(services)
        .where(isNull(services.deletedAt))
        .orderBy(services.createdAt, services.id)
        .limit(limit)
        .offset((page - 1) * limit),
      this.db
        .select({ total: count() })
        .from(services)
        .where(isNull(services.deletedAt)),
    ]);
    return { items: rows.map(toEntity), total };
  }

  async save(service: Service): Promise<void> {
    const row: ServiceRow = {
      id: service.id,
      name: service.name,
      description: service.description,
      category: service.category,
      laborPriceInCents: service.laborPriceInCents,
      estimatedDuration: service.estimatedDuration,
      warrantyDays: service.warrantyDays,
      active: service.active,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
      deletedAt: service.deletedAt,
    };

    try {
      await this.db
        .insert(services)
        .values(row)
        .onConflictDoUpdate({ target: services.id, set: row });
    } catch (error) {
      if (isUniqueViolation(error)) {
        throw new ServiceNameAlreadyExistsError(service.name, { cause: error });
      }
      throw error;
    }
  }

  async findManyByIds(ids: string[]): Promise<Service[]> {
    if (ids.length === 0) return [];

    const rows = await this.db
      .select()
      .from(services)
      .where(and(inArray(services.id, ids), isNull(services.deletedAt)));
    return rows.map(toEntity);
  }

  // One query for every service's bill of materials; the caller's ids are
  // seeded to an empty list first so a service with no parts is still present.
  async findSuppliesFor(
    serviceIds: string[],
  ): Promise<Map<string, ServiceSupply[]>> {
    const billsOfMaterials = new Map<string, ServiceSupply[]>(
      serviceIds.map((serviceId) => [serviceId, []]),
    );
    if (serviceIds.length === 0) return billsOfMaterials;

    const rows = await this.db
      .select()
      .from(serviceSupplies)
      .where(inArray(serviceSupplies.serviceId, serviceIds));

    for (const row of rows) {
      billsOfMaterials
        .get(row.serviceId)
        ?.push({ supplyId: row.supplyId, quantity: row.quantity });
    }
    return billsOfMaterials;
  }

  async replaceSupplies(
    serviceId: string,
    supplies: ServiceSupply[],
  ): Promise<void> {
    await this.db
      .delete(serviceSupplies)
      .where(eq(serviceSupplies.serviceId, serviceId));

    if (supplies.length === 0) return;

    await this.db.insert(serviceSupplies).values(
      supplies.map((supply) => ({
        serviceId,
        supplyId: supply.supplyId,
        quantity: supply.quantity,
      })),
    );
  }
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  return (
    candidate.code === PG_UNIQUE_VIOLATION || isUniqueViolation(candidate.cause)
  );
}
