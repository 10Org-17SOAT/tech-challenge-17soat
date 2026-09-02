import { Inject, Injectable } from '@nestjs/common';
import { SERVICE_ORDER_REPOSITORY } from '../../service-orders/domain/service-order.repository';
import type { ServiceOrderRepository } from '../../service-orders/domain/service-order.repository';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { ANAMNESIS_REPOSITORY } from '../domain/anamnesis.repository';
import type { AnamnesisRepository } from '../domain/anamnesis.repository';
import { AnamnesisNotFoundException } from '../domain/exceptions/anamnesis.exceptions';

@Injectable()
export class DeleteAnamnesisUseCase {
  constructor(
    @Inject(ANAMNESIS_REPOSITORY)
    private readonly anamnesisRepository: AnamnesisRepository,
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

  async execute(serviceOrderId: string): Promise<void> {
    const order = await this.orderRepository.findById(serviceOrderId);
    if (!order) {
      throw new ServiceOrderNotFoundError(serviceOrderId);
    }

    const anamnesis =
      await this.anamnesisRepository.findByServiceOrderId(serviceOrderId);
    if (!anamnesis || anamnesis.deletedAt !== null) {
      // A soft-deleted anamnesis is treated as not found (404).
      throw new AnamnesisNotFoundException(serviceOrderId);
    }

    // The entity enforces the lock guard: delete throws
    // AnamnesisLockedException unless the order is "received".
    anamnesis.delete(order.status);
    await this.anamnesisRepository.save(anamnesis);
  }
}