import { Inject, Injectable } from '@nestjs/common';
import {
  CUSTOMER_CONTACT_QUERY,
  type CustomerContactQuery,
} from '../../../onboarding/customer/public/customer-contact.query';
import {
  VEHICLE_CATALOG_QUERY,
  type VehicleCatalogQuery,
} from '../../../onboarding/vehicles/public/vehicle-catalog.query';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrderStatus } from '../domain/service-order.entity';
import { SERVICE_ORDER_REPOSITORY } from '../domain/service-order.repository';
import type { ServiceOrderRepository } from '../domain/service-order.repository';

@Injectable()
export class GetServiceOrderStatusUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
    @Inject(CUSTOMER_CONTACT_QUERY)
    private readonly customers: CustomerContactQuery,
    @Inject(VEHICLE_CATALOG_QUERY)
    private readonly vehicles: VehicleCatalogQuery,
  ) {}

  /**
   * `requesterUserId` narrows the answer to orders that belong to that auth
   * account. Callers who may read any order — an admin — omit it.
   *
   * An order the requester does not own is reported as missing rather than
   * forbidden: a 403 would confirm which ids exist, letting someone map the
   * workshop's orders by probing.
   */
  async execute(
    id: string,
    requesterUserId?: string,
  ): Promise<ServiceOrderStatus> {
    const order = await this.orderRepository.findById(id);
    if (!order) {
      throw new ServiceOrderNotFoundError(id);
    }

    if (
      requesterUserId &&
      !(await this.belongsTo(order.vehicleId, requesterUserId))
    ) {
      throw new ServiceOrderNotFoundError(id);
    }

    return order.status;
  }

  /**
   * The order carries no customer — it is derived through the car, which is
   * the one place that owner lives.
   */
  private async belongsTo(
    vehicleId: string,
    requesterUserId: string,
  ): Promise<boolean> {
    const customerId = await this.customers.findIdByUserId(requesterUserId);
    if (!customerId) {
      return false;
    }

    const vehicle = await this.vehicles.findById(vehicleId);
    return vehicle?.ownerId === customerId;
  }
}
