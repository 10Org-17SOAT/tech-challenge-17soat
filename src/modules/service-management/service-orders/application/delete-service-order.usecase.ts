import { Inject, Injectable } from '@nestjs/common';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ANAMNESIS_CASCADE_PORT } from '../domain/ports/anamnesis-cascade.port';
import type { AnamnesisCascadePort } from '../domain/ports/anamnesis-cascade.port';
import { SERVICE_ORDER_REPOSITORY } from '../domain/service-order.repository';
import type { ServiceOrderRepository } from '../domain/service-order.repository';

@Injectable()
export class DeleteServiceOrderUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
    @Inject(ANAMNESIS_CASCADE_PORT)
    private readonly anamnesisCascade: AnamnesisCascadePort,
  ) {}

  async execute(id: string): Promise<void> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new ServiceOrderNotFoundError(id);
    }

    order.delete();
    await this.orderRepository.save(order);
    // OS soft-delete cascades to the anamnesis (spec AC-15).
    await this.anamnesisCascade.softDeleteByServiceOrderId(id);
  }
}