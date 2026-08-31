import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import { ServiceItem } from '../../domain/service-item';
import { ServiceOrder } from '../../domain/service-order.entity';
import type {
  ListServiceOrdersFilter,
  ServiceOrderRepository,
  PaginatedServiceOrders,
} from '../../domain/service-order.repository';
import { serviceItems, serviceOrders } from './schema';

type ServiceOrderRow = typeof serviceOrders.$inferSelect;

function toEntity(row: ServiceOrderRow): ServiceOrder {
  return ServiceOrder.restore(row);
}

@Injectable()
export class DrizzleServiceOrderRepository implements ServiceOrderRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findById(id: string): Promise<ServiceOrder | null> {
    const rows = await this.db
      .select()
      .from(serviceOrders)
      .where(and(eq(serviceOrders.id, id), isNull(serviceOrders.deletedAt)))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findMany({
    page,
    limit,
    status,
  }: ListServiceOrdersFilter): Promise<PaginatedServiceOrders> {
    const where = and(
      isNull(serviceOrders.deletedAt),
      status ? eq(serviceOrders.status, status) : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(serviceOrders)
        .where(where)
        .orderBy(desc(serviceOrders.createdAt), serviceOrders.id)
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(serviceOrders).where(where),
    ]);
    return { items: rows.map(toEntity), total };
  }

  async save(order: ServiceOrder): Promise<void> {
    const row: ServiceOrderRow = {
      id: order.id,
      vehicleId: order.vehicleId,
      openedById: order.openedById,
      openedByName: order.openedByName,
      status: order.status,
      approvedByCustomer: order.approvedByCustomer,
      notes: order.notes,
      vehicleMileageAtEntry: order.vehicleMileageAtEntry,
      scheduledAt: order.scheduledAt,
      startedAt: order.startedAt,
      completedAt: order.completedAt,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
      deletedAt: order.deletedAt,
    };

    await this.db
      .insert(serviceOrders)
      .values(row)
      .onConflictDoUpdate({ target: serviceOrders.id, set: row });
  }

  async findItems(serviceOrderId: string): Promise<ServiceItem[]> {
    const rows = await this.db
      .select()
      .from(serviceItems)
      .where(eq(serviceItems.serviceOrderId, serviceOrderId));
    return rows.map((row) =>
      ServiceItem.create({ serviceId: row.serviceId, quantity: row.quantity }),
    );
  }

  // The scope of work is replaced wholesale, never patched line by line: a
  // diagnosis states what the order needs, it does not amend a previous list.
  async replaceItems(
    serviceOrderId: string,
    items: ServiceItem[],
  ): Promise<void> {
    await this.db
      .delete(serviceItems)
      .where(eq(serviceItems.serviceOrderId, serviceOrderId));

    if (items.length === 0) return;

    await this.db.insert(serviceItems).values(
      items.map((item) => ({
        serviceOrderId,
        serviceId: item.serviceId,
        quantity: item.quantity,
      })),
    );
  }
}
