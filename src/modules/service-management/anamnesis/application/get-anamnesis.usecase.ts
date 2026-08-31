import { Inject, Injectable } from '@nestjs/common';
import { SERVICE_ORDER_REPOSITORY } from '../../service-orders/domain/service-order.repository';
import type { ServiceOrderRepository } from '../../service-orders/domain/service-order.repository';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { Anamnesis } from '../domain/anamnesis.entity';
import { ANAMNESIS_REPOSITORY } from '../domain/anamnesis.repository';
import type { AnamnesisRepository } from '../domain/anamnesis.repository';
import { AnamnesisNotFoundException } from '../domain/exceptions/anamnesis.exceptions';

export interface GetAnamnesisResult {
  anamnesis: Anamnesis;
  vehicleId: string;
}

@Injectable()
export class GetAnamnesisUseCase {
  constructor(
    @Inject(ANAMNESIS_REPOSITORY)
    private readonly anamnesisRepository: AnamnesisRepository,
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
  ) {}

async execute(serviceOrderId: string): Promise<GetAnamnesisResult> {
    const order = await this.orderRepository.findById(serviceOrderId);
    if (!order) {
      throw new ServiceOrderNotFoundError(serviceOrderId);
    }

    const anamnesis =
      await this.anamnesisRepository.findByServiceOrderId(serviceOrderId);
    if (!anamnesis) {
      throw new AnamnesisNotFoundException(serviceOrderId);
    }
// vehicleId is derived from the OS (join), not stored on the anamnesis.
return { anamnesis, vehicleId: order.vehicleId };

  }
}