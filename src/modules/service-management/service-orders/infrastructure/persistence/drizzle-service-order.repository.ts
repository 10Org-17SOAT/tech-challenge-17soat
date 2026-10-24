import { Inject, Injectable } from '@nestjs/common';
import {
  and,
  asc,
  count,
  eq,
  gte,
  inArray,
  isNotNull,
  isNull,
  lte,
  sql,
} from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import { ServiceItem } from '../../domain/service-item';
import {
  LISTING_STATUS_PRIORITY,
  ServiceOrder,
} from '../../domain/service-order.entity';
import type {
  ExecutionTimeFilter,
  ExecutionTimeStats,
  ListServiceOrdersFilter,
  ServiceOrderRepository,
  PaginatedServiceOrders,
} from '../../domain/service-order.repository';
import { serviceItems, serviceOrders } from './schema';

type ServiceOrderRow = typeof serviceOrders.$inferSelect;

function toEntity(row: ServiceOrderRow): ServiceOrder {
  return ServiceOrder.restore(row);
}

// Sorted in the database, not in memory: pagination has to slice the already
// ordered queue. Statuses outside the priority list (only reachable through an
// explicit filter) all share the last rank.
const statusPriority = sql`case ${serviceOrders.status} ${sql.join(
  LISTING_STATUS_PRIORITY.map(
    (status, rank) => sql`when ${status} then ${sql.raw(String(rank))}`,
  ),
  sql` `,
)} else ${sql.raw(String(LISTING_STATUS_PRIORITY.length))} end`;

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
      status
        ? eq(serviceOrders.status, status)
        : inArray(serviceOrders.status, [...LISTING_STATUS_PRIORITY]),
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(serviceOrders)
        .where(where)
        .orderBy(
          statusPriority,
          asc(serviceOrders.createdAt),
          asc(serviceOrders.id),
        )
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
      deliveredAt: order.deliveredAt,
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

  // `avg` over zero rows is null in Postgres, which is exactly the answer we
  // want for an empty window — it travels up untouched. The raw average is
  // returned unrounded: rounding is a presentation call, made in the use case.
  async averageExecutionTime({
    from,
    to,
  }: ExecutionTimeFilter): Promise<ExecutionTimeStats> {
    const where = and(
      isNull(serviceOrders.deletedAt),
      eq(serviceOrders.status, 'finished'),
      // Belt and braces: the linear status flow guarantees both timestamps on
      // a finished order, but the aggregate must never average over a null.
      isNotNull(serviceOrders.startedAt),
      isNotNull(serviceOrders.completedAt),
      from ? gte(serviceOrders.completedAt, from) : undefined,
      to ? lte(serviceOrders.completedAt, to) : undefined,
    );

    const [row] = await this.db
      .select({
        averageMinutes: sql<
          string | null
        >`avg(extract(epoch from ${serviceOrders.completedAt} - ${serviceOrders.startedAt}) / 60)`,
        sampleSize: count(),
      })
      .from(serviceOrders)
      .where(where);

    return {
      // `avg` comes back as numeric, which node-postgres hands over as a
      // string to protect precision it does not know we can spare.
      averageMinutes:
        row.averageMinutes === null ? null : Number(row.averageMinutes),
      sampleSize: row.sampleSize,
    };
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
