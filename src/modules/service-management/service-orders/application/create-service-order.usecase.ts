import { Inject, Injectable } from '@nestjs/common';
import { CONSULTANT_DIRECTORY_QUERY } from '../../../onboarding/consultant/public/consultant-directory.query';
import type { ConsultantDirectoryQuery } from '../../../onboarding/consultant/public/consultant-directory.query';
import { VEHICLE_CATALOG_QUERY } from '../../../onboarding/vehicles/public/vehicle-catalog.query';
import type { VehicleCatalogQuery } from '../../../onboarding/vehicles/public/vehicle-catalog.query';
import { SUPPLY_CATALOG_QUERY } from '../../../stock/inventory/public/supply-catalog.query';
import type { SupplyCatalogQuery } from '../../../stock/inventory/public/supply-catalog.query';
import { SERVICE_REPOSITORY } from '../../services/domain/service.repository';
import type { ServiceRepository } from '../../services/domain/service.repository';
import { ConsultantNotFoundForServiceOrderError } from '../domain/errors/consultant-not-found-for-service-order.error';
import { PartsNotFoundForServiceOrderError } from '../domain/errors/parts-not-found-for-service-order.error';
import { ServicesNotFoundForServiceOrderError } from '../domain/errors/services-not-found-for-service-order.error';
import { VehicleNotFoundForServiceOrderError } from '../domain/errors/vehicle-not-found-for-service-order.error';
import { RequestedPart } from '../domain/requested-items';
import type { RequestedItems } from '../domain/requested-items';
import { ServiceItem } from '../domain/service-item';
import { ServiceOrder } from '../domain/service-order.entity';
import { SERVICE_ORDER_REPOSITORY } from '../domain/service-order.repository';
import type { ServiceOrderRepository } from '../domain/service-order.repository';

export interface CreateServiceOrderInput {
  vehicleId: string;
  openedById: string;
  services: { serviceId: string; quantity: number }[];
  parts: { supplyId: string; quantity: number }[];
  notes?: string | null;
  vehicleMileageAtEntry?: number | null;
  scheduledAt?: Date | null;
}

export interface CreateServiceOrderOutput {
  order: ServiceOrder;
  requestedItems: RequestedItems;
}

/**
 * Reception opening an order: which car, who opened it, and what the customer
 * asked for. Customer and vehicle are onboarding's; they are registered there
 * first and referenced here by id. The customer is the vehicle's owner.
 *
 * Everything that can be rejected is validated before the first write, so a
 * rejected request persists nothing.
 */
@Injectable()
export class CreateServiceOrderUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
    @Inject(CONSULTANT_DIRECTORY_QUERY)
    private readonly consultants: ConsultantDirectoryQuery,
    @Inject(VEHICLE_CATALOG_QUERY)
    private readonly vehicles: VehicleCatalogQuery,
    @Inject(SERVICE_REPOSITORY)
    private readonly services: ServiceRepository,
    @Inject(SUPPLY_CATALOG_QUERY)
    private readonly supplies: SupplyCatalogQuery,
  ) {}

  async execute(
    input: CreateServiceOrderInput,
  ): Promise<CreateServiceOrderOutput> {
    // Name is resolved server-side from the directory, never taken from the
    // client, so the snapshot stays trustworthy.
    const consultant = await this.consultants.findById(input.openedById);
    if (!consultant) {
      throw new ConsultantNotFoundForServiceOrderError(input.openedById);
    }

    const vehicle = await this.vehicles.findById(input.vehicleId);
    if (!vehicle) {
      throw new VehicleNotFoundForServiceOrderError(input.vehicleId);
    }

    const requestedItems = await this.resolveRequestedItems(input);

    const order = ServiceOrder.create({
      vehicleId: vehicle.id,
      openedById: consultant.id,
      openedByName: consultant.name,
      notes: input.notes,
      vehicleMileageAtEntry: input.vehicleMileageAtEntry,
      scheduledAt: input.scheduledAt,
    });

    await this.orderRepository.save(order);
    await this.orderRepository.saveRequestedItems(order.id, requestedItems);

    return { order, requestedItems };
  }

  private async resolveRequestedItems(
    input: CreateServiceOrderInput,
  ): Promise<RequestedItems> {
    const services = input.services.map((item) => ServiceItem.create(item));
    const parts = input.parts.map((part) => RequestedPart.create(part));

    const serviceIds = services.map((item) => item.serviceId);
    const supplyIds = parts.map((part) => part.supplyId);

    const [foundServices, foundSupplies] = await Promise.all([
      this.services.findManyByIds(serviceIds),
      this.supplies.findManyByIds(supplyIds),
    ]);

    const knownServices = new Set(foundServices.map((service) => service.id));
    const missingServices = serviceIds.filter((id) => !knownServices.has(id));
    if (missingServices.length > 0) {
      throw new ServicesNotFoundForServiceOrderError(missingServices);
    }

    const missingParts = supplyIds.filter((id) => !foundSupplies.has(id));
    if (missingParts.length > 0) {
      throw new PartsNotFoundForServiceOrderError(missingParts);
    }

    return { services, parts };
  }
}
