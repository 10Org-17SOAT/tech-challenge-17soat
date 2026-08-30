import { Inject, Injectable } from '@nestjs/common';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../domain/service-order.entity';
import { SERVICE_ORDER_REPOSITORY } from '../domain/service-order.repository';
import type { ServiceOrderRepository } from '../domain/service-order.repository';

@Injectable()
export class StartDiagnosisUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  async execute(serviceOrderId: string): Promise<ServiceOrder> {
    const order = await this.orderRepository.findById(serviceOrderId);
    if (!order) {
      throw new ServiceOrderNotFoundError(serviceOrderId);
    }

    order.transitionTo('in_diagnosis');
    await this.orderRepository.save(order);
    return order;
  }
}
