import { Inject, Injectable } from '@nestjs/common';
import { ServiceNameAlreadyExistsError } from '@/modules/service-order/services/domain/errors/service-name-already-exists.error';
import { ServiceNotFoundError } from '@/modules/service-order/services/domain/errors/service-not-found.error';
import {
  Service,
  ServiceCategory,
} from '@/modules/service-order/services/domain/service.entity';
import { SERVICE_REPOSITORY } from '@/modules/service-order/services/domain/service.repository';
import type { ServiceRepository } from '@/modules/service-order/services/domain/service.repository';

export interface UpdateServiceInput {
  name?: string;
  description?: string | null;
  category?: ServiceCategory;
  priceInCents?: number;
  estimatedDuration?: number | null;
  warrantyDays?: number | null;
  active?: boolean;
}

@Injectable()
export class UpdateServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(id: string, input: UpdateServiceInput): Promise<Service> {
    const service = await this.serviceRepository.findById(id);
    if (!service) {
      throw new ServiceNotFoundError(id);
    }

    service.update(input);

    if (input.name !== undefined) {
      const existing = await this.serviceRepository.findByName(service.name);
      if (existing && existing.id !== service.id) {
        throw new ServiceNameAlreadyExistsError(service.name);
      }
    }

    await this.serviceRepository.save(service);
    return service;
  }
}
