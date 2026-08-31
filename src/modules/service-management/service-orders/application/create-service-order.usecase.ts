import { Inject, Injectable } from '@nestjs/common';
import { CONSULTANT_DIRECTORY_QUERY } from '../../../onboarding/consultant/public/consultant-directory.query';
import type { ConsultantDirectoryQuery } from '../../../onboarding/consultant/public/consultant-directory.query';
import { VEHICLE_CATALOG_QUERY } from '../../../onboarding/vehicles/public/vehicle-catalog.query';
import type { VehicleCatalogQuery } from '../../../onboarding/vehicles/public/vehicle-catalog.query';
import { ConsultantNotFoundForServiceOrderError } from '../domain/errors/consultant-not-found-for-service-order.error';
import { VehicleNotFoundForServiceOrderError } from '../domain/errors/vehicle-not-found-for-service-order.error';
import { ServiceOrder } from '../domain/service-order.entity';
import { SERVICE_ORDER_REPOSITORY } from '../domain/service-order.repository';
import type { ServiceOrderRepository } from '../domain/service-order.repository';

export interface CreateServiceOrderInput {
  vehicleId: string;
  openedById: string;
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
    @Inject(CONSULTANT_DIRECTORY_QUERY)
    private readonly consultants: ConsultantDirectoryQuery,
  ) {}

  async execute(input: CreateServiceOrderInput): Promise<ServiceOrder> {
    const vehicle = await this.vehicles.findById(input.vehicleId);
    if (!vehicle) {
      throw new VehicleNotFoundForServiceOrderError(input.vehicleId);
    }

    // Name is resolved server-side from the directory, never taken from the
    // client, so the snapshot stays trustworthy.
    const consultant = await this.consultants.findById(input.openedById);
    if (!consultant) {
      throw new ConsultantNotFoundForServiceOrderError(input.openedById);
    }

    const order = ServiceOrder.create({
      ...input,
      openedByName: consultant.name,
    });
    await this.orderRepository.save(order);
    return order;
  }
}
