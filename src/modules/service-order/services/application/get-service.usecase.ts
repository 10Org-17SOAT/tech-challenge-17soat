import { Inject, Injectable } from '@nestjs/common';
import { ServiceNotFoundError } from '../domain/errors/service-not-found.error';
import { Service } from '../domain/service.entity';
import { SERVICE_REPOSITORY } from '../domain/service.repository';
import type { ServiceRepository } from '../domain/service.repository';

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
