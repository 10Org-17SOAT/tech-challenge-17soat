import { Inject, Injectable } from '@nestjs/common';
import { ServiceNameAlreadyExistsError } from '@/modules/service-order/services/domain/errors/service-name-already-exists.error';
import {
  Service,
  ServiceCategory,
} from '@/modules/service-order/services/domain/service.entity';
import { SERVICE_REPOSITORY } from '@/modules/service-order/services/domain/service.repository';
import type { ServiceRepository } from '@/modules/service-order/services/domain/service.repository';

export interface CreateServiceInput {
  name: string;
  description?: string | null;
  category: ServiceCategory;
  priceInCents: number;
  estimatedDuration?: number | null;
  warrantyDays?: number | null;
}

@Injectable()
export class CreateServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(input: CreateServiceInput): Promise<Service> {
    const service = Service.create(input);

    const existing = await this.serviceRepository.findByName(service.name);
    if (existing) {
      throw new ServiceNameAlreadyExistsError(service.name);
    }

    await this.serviceRepository.save(service);
    return service;
  }
}
