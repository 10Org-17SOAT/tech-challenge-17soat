import { Inject, Injectable } from '@nestjs/common';
import { Order } from '../domain/order.entity';
import { ORDER_REPOSITORY } from '../domain/order.repository';
import type { OrderRepository } from '../domain/order.repository';

export interface CreateOrderInput {
  notes?: string | null;
  vehicleMileageAtEntry?: number | null;
  scheduledAt?: Date | null;
}

@Injectable()
export class CreateOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(input: CreateOrderInput): Promise<Order> {
    const order = Order.create(input);
    await this.orderRepository.save(order);
    return order;
  }
}
