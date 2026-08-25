import { Inject, Injectable } from '@nestjs/common';
import { OrderNotFoundError } from '../domain/errors/order-not-found.error';
import { Order } from '../domain/order.entity';
import { ORDER_REPOSITORY } from '../domain/order.repository';
import type { OrderRepository } from '../domain/order.repository';

@Injectable()
export class GetOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(id: string): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new OrderNotFoundError(id);
    }
    return order;
  }
}
