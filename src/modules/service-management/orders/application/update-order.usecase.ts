import { Inject, Injectable } from '@nestjs/common';
import { OrderNotFoundError } from '../domain/errors/order-not-found.error';
import { Order } from '../domain/order.entity';
import { ORDER_REPOSITORY } from '../domain/order.repository';
import type { OrderRepository } from '../domain/order.repository';

export interface UpdateOrderInput {
  notes?: string | null;
  vehicleMileageAtEntry?: number | null;
  scheduledAt?: Date | null;
}

@Injectable()
export class UpdateOrderUseCase {
  constructor(
    @Inject(ORDER_REPOSITORY)
    private readonly orderRepository: OrderRepository,
  ) {}

  async execute(id: string, input: UpdateOrderInput): Promise<Order> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new OrderNotFoundError(id);
    }

    order.update(input);
    await this.orderRepository.save(order);
    return order;
  }
}
