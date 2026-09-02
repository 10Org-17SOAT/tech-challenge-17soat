import { Inject, Injectable } from '@nestjs/common';
import { AnamnesisRequiredException } from '../../anamnesis/domain/exceptions/anamnesis.exceptions';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../domain/service-order.entity';
import { ANAMNESIS_EXISTENCE_PORT } from '../domain/ports/anamnesis-existence.port';
import type { AnamnesisExistencePort } from '../domain/ports/anamnesis-existence.port';
import { SERVICE_ORDER_REPOSITORY } from '../domain/service-order.repository';
import type { ServiceOrderRepository } from '../domain/service-order.repository';

@Injectable()
export class StartDiagnosisUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
    @Inject(ANAMNESIS_EXISTENCE_PORT)
    private readonly anamnesisExistence: AnamnesisExistencePort,
  ) {}

  async execute(serviceOrderId: string): Promise<ServiceOrder> {
    const order = await this.orderRepository.findById(serviceOrderId);
    if (!order) {
      throw new ServiceOrderNotFoundError(serviceOrderId);
    }

    const hasAnamnesis =
      await this.anamnesisExistence.existsByServiceOrderId(serviceOrderId);
    if (!hasAnamnesis) {
      throw new AnamnesisRequiredException(serviceOrderId);
    }

    order.transitionTo('in_diagnosis');
    await this.orderRepository.save(order);
    return order;
  }
}