import { Inject, Injectable } from '@nestjs/common';
import { ServiceNotFoundError } from '../domain/errors/service-not-found.error';
import { SERVICE_REPOSITORY } from '../domain/service.repository';
import type { ServiceRepository } from '../domain/service.repository';

@Injectable()
export class DeleteServiceUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const service = await this.serviceRepository.findById(id);
    if (!service) {
      throw new ServiceNotFoundError(id);
    }

    service.delete();
    await this.serviceRepository.save(service);
  }
}
