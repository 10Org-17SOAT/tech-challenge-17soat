import { Inject, Injectable } from '@nestjs/common';
import { ServiceOrder } from '../domain/service-order.entity';
import { SERVICE_ORDER_REPOSITORY } from '../domain/service-order.repository';
import type { ServiceOrderRepository } from '../domain/service-order.repository';

export interface CreateServiceOrderInput {
  notes?: string | null;
  vehicleMileageAtEntry?: number | null;
  scheduledAt?: Date | null;
}

@Injectable()
export class CreateServiceOrderUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  async execute(input: CreateServiceOrderInput): Promise<ServiceOrder> {
    const order = ServiceOrder.create(input);
    await this.orderRepository.save(order);
    return order;
  }
}
