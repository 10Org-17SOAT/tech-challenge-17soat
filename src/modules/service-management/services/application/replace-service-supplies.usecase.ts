import { Inject, Injectable } from '@nestjs/common';
import { InvalidServiceError } from '../domain/errors/invalid-service.error';
import { ServiceNotFoundError } from '../domain/errors/service-not-found.error';
import { SERVICE_REPOSITORY } from '../domain/service.repository';
import type {
  ServiceRepository,
  ServiceSupply,
} from '../domain/service.repository';

/**
 * Sets a service's bill of materials — what a quotation will pull in as parts
 * whenever this service is on an order.
 *
 * Supply ids are not checked against the stock catalogue here: prices and
 * availability are resolved when the quotation is issued, and that is also
 * where a missing part refuses the operation.
 */
@Injectable()
export class ReplaceServiceSuppliesUseCase {
  constructor(
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepository,
  ) {}

  async execute(
    serviceId: string,
    supplies: ServiceSupply[],
  ): Promise<ServiceSupply[]> {
    const service = await this.serviceRepository.findById(serviceId);
    if (!service) {
      throw new ServiceNotFoundError(serviceId);
    }

    const supplyIds = new Set(supplies.map((supply) => supply.supplyId));
    if (supplyIds.size !== supplies.length) {
      throw new InvalidServiceError(
        'A supply may appear only once in a bill of materials',
      );
    }

    await this.serviceRepository.replaceSupplies(serviceId, supplies);
    return supplies;
  }
}
