import { Inject, Injectable } from '@nestjs/common';
import { ServiceNotFoundError } from '../domain/errors/service-not-found.error';
import { SERVICE_REPOSITORY } from '../domain/service.repository';
import type {
  ServiceRepository,
  ServiceSupply,
} from '../domain/service.repository';

@Injectable()
export class GetServiceSuppliesUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(serviceId: string): Promise<ServiceSupply[]> {
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) {
      throw new ServiceNotFoundError(serviceId);
    }

    const billsOfMaterials = await this.serviceRepository.findSuppliesFor([
      serviceId,
    ]);
    return billsOfMaterials.get(serviceId) ?? [];
  }
}
