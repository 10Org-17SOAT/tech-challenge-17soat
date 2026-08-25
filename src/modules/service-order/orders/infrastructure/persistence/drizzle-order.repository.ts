import { Inject, Injectable } from '@nestjs/common';
import { and, count, desc, eq, isNull } from 'drizzle-orm';
import { DATABASE_CONNECTION } from '../../../../../shared/config/database/database.constants';
import type { DrizzleDatabase } from '../../../../../shared/config/database/drizzle.provider';
import { Order } from '../../domain/order.entity';
import type {
  ListOrdersFilter,
  OrderRepository,
  PaginatedOrders,
} from '../../domain/order.repository';
import { orders } from './schema';

type OrderRow = typeof orders.$inferSelect;

function toEntity(row: OrderRow): Order {
  return Order.restore(row);
}

@Injectable()
export class DrizzleOrderRepository implements OrderRepository {
  constructor(
    @Inject(DATABASE_CONNECTION) private readonly db: DrizzleDatabase,
  ) {}

  async findById(id: string): Promise<Order | null> {
    const rows = await this.db
      .select()
      .from(orders)
      .where(and(eq(orders.id, id), isNull(orders.deletedAt)))
      .limit(1);
    return rows[0] ? toEntity(rows[0]) : null;
  }

  async findMany({
    page,
    limit,
    status,
  }: ListOrdersFilter): Promise<PaginatedOrders> {
    const where = and(
      isNull(orders.deletedAt),
      status ? eq(orders.status, status) : undefined,
    );

    const [rows, [{ total }]] = await Promise.all([
      this.db
        .select()
        .from(orders)
        .where(where)
        .orderBy(desc(orders.createdAt), orders.id)
        .limit(limit)
        .offset((page - 1) * limit),
      this.db.select({ total: count() }).from(orders).where(where),
    ]);
    return { items: rows.map(toEntity), total };
  }

  async save(order: Order): Promise<void> {
    const row: OrderRow = {
      id: order.id,
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
      .insert(orders)
      .values(row)
      .onConflictDoUpdate({ target: orders.id, set: row });
  }
}
