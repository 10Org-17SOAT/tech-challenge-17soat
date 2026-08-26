import { Inject, Injectable } from '@nestjs/common';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { SERVICE_ORDER_REPOSITORY } from '../domain/service-order.repository';
import type { ServiceOrderRepository } from '../domain/service-order.repository';

@Injectable()
export class DeleteServiceOrderUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new ServiceOrderNotFoundError(id);
    }

    order.delete();
    await this.orderRepository.save(order);
  }
}
