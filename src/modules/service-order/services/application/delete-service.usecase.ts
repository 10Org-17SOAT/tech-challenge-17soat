import { Inject, Injectable } from '@nestjs/common';
import { ServiceNotFoundError } from '@/modules/service-order/services/domain/errors/service-not-found.error';
import { SERVICE_REPOSITORY } from '@/modules/service-order/services/domain/service.repository';
import type { ServiceRepository } from '@/modules/service-order/services/domain/service.repository';

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
