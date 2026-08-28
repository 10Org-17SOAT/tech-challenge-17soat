import { Inject, Injectable } from '@nestjs/common';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrderStatus } from '../domain/service-order.entity';
import { SERVICE_ORDER_REPOSITORY } from '../domain/service-order.repository';
import type { ServiceOrderRepository } from '../domain/service-order.repository';

@Injectable()
export class GetServiceOrderStatusUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  async execute(id: string): Promise<ServiceOrderStatus> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new ServiceOrderNotFoundError(id);
    }
    return order.status;
  }
}
