import { Inject, Injectable } from '@nestjs/common';
import { ServiceNotFoundError } from '@/modules/service-order/services/domain/errors/service-not-found.error';
import { Service } from '@/modules/service-order/services/domain/service.entity';
import { SERVICE_REPOSITORY } from '@/modules/service-order/services/domain/service.repository';
import type { ServiceRepository } from '@/modules/service-order/services/domain/service.repository';

@Injectable()
export class GetServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(id: string): Promise<Service> {
    const service = await this.serviceRepository.findById(id);
    if (!service) {
      throw new ServiceNotFoundError(id);
    }
    return service;
  }
}
