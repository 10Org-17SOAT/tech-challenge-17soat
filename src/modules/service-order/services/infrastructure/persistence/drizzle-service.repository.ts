import { Inject, Injectable } from '@nestjs/common';
import { and, count, eq, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import { ServiceNameAlreadyExistsError } from '../../domain/errors/service-name-already-exists.error';
import { Service } from '../../domain/service.entity';
import {
  PaginatedServices,
  Pagination,
  ServiceRepository,
} from '../../domain/service.repository';
import { services } from './schema';

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
      priceInCents: service.priceInCents,
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
}

function isUniqueViolation(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) return false;
  const candidate = error as { code?: unknown; cause?: unknown };
  return (
    candidate.code === PG_UNIQUE_VIOLATION || isUniqueViolation(candidate.cause)
  );
}
