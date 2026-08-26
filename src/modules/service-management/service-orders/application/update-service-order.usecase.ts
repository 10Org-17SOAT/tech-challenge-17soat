import { Inject, Injectable } from '@nestjs/common';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../domain/service-order.entity';
import { SERVICE_ORDER_REPOSITORY } from '../domain/service-order.repository';
import type { ServiceOrderRepository } from '../domain/service-order.repository';

export interface UpdateServiceOrderInput {
  notes?: string | null;
  vehicleMileageAtEntry?: number | null;
  scheduledAt?: Date | null;
}

@Injectable()
export class UpdateServiceOrderUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  async execute(id: string, input: UpdateServiceOrderInput): Promise<ServiceOrder> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new ServiceOrderNotFoundError(id);
    }

    order.update(input);
    await this.orderRepository.save(order);
    return order;
  }
}
