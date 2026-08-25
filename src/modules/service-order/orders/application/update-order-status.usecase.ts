import { Inject, Injectable } from '@nestjs/common';
import { OrderNotFoundError } from '../domain/errors/order-not-found.error';
import { Order, OrderStatus } from '../domain/order.entity';
import { ORDER_REPOSITORY } from '../domain/order.repository';
import type { OrderRepository } from '../domain/order.repository';

@Injectable()
export class UpdateOrderStatusUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(id: string, status: OrderStatus): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new OrderNotFoundError(id);
    }

    order.transitionTo(status);
    await this.orderRepository.save(order);
    return order;
  }
}
