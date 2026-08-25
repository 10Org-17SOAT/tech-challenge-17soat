import { Inject, Injectable } from '@nestjs/common';
import { Order } from '../domain/order.entity';
import { ORDER_REPOSITORY } from '../domain/order.repository';
import type {
  ListOrdersFilter,
  OrderRepository,
} from '../domain/order.repository';

export interface ListOrdersOutput {
  items: Order[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ListOrdersUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(filter: ListOrdersFilter): Promise<ListOrdersOutput> {
    const { items, total } = await this.orderRepository.findMany(filter);
    return { items, total, page: filter.page, limit: filter.limit };
  }
}
