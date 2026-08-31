import { Inject, Injectable } from '@nestjs/common';
import { VEHICLE_CATALOG_QUERY } from '../../../onboarding/vehicles/public/vehicle-catalog.query';
import type { VehicleCatalogQuery } from '../../../onboarding/vehicles/public/vehicle-catalog.query';
import { VehicleNotFoundForServiceOrderError } from '../domain/errors/vehicle-not-found-for-service-order.error';
import { ServiceOrder } from '../domain/service-order.entity';
import { SERVICE_ORDER_REPOSITORY } from '../domain/service-order.repository';
import type { ServiceOrderRepository } from '../domain/service-order.repository';

export interface CreateServiceOrderInput {
  vehicleId: string;
  notes?: string | null;
  vehicleMileageAtEntry?: number | null;
  scheduledAt?: Date | null;
}

@Injectable()
export class CreateServiceOrderUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
    @Inject(VEHICLE_CATALOG_QUERY)
    private readonly vehicles: VehicleCatalogQuery,
  ) {}

  async execute(input: CreateServiceOrderInput): Promise<ServiceOrder> {
    const vehicle = await this.vehicles.findById(input.vehicleId);
    if (!vehicle) {
      throw new VehicleNotFoundForServiceOrderError(input.vehicleId);
    }

    const order = ServiceOrder.create(input);
    await this.orderRepository.save(order);
    return order;
  }
}
