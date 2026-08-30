import { Inject, Injectable } from '@nestjs/common';
import { CUSTOMER_CONTACT_QUERY } from '../../../onboarding/customer/public/customer-contact.query';
import type { CustomerContactQuery } from '../../../onboarding/customer/public/customer-contact.query';
import { VEHICLE_CATALOG_QUERY } from '../../../onboarding/vehicles/public/vehicle-catalog.query';
import type { VehicleCatalogQuery } from '../../../onboarding/vehicles/public/vehicle-catalog.query';
import { SERVICE_ORDER_REPOSITORY } from '../../service-orders/domain/service-order.repository';
import type { ServiceOrderRepository } from '../../service-orders/domain/service-order.repository';
import type {
  QuotationRecipient,
  QuotationRecipientQuery,
} from '../domain/quotation-recipient.port';

/**
 * The single place that knows the customer of a quotation is the owner of the
 * vehicle on its service order.
 *
 * It imports only the published contracts of `vehicles` and `customer` — never
 * their domain, use cases or repositories — and each of those publishes only
 * its own columns: `vehicles` hands over an `ownerId`, and says nothing about
 * who that person is.
 */
@Injectable()
export class OnboardingQuotationRecipientQuery implements QuotationRecipientQuery {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orders: ServiceOrderRepository,
    @Inject(VEHICLE_CATALOG_QUERY)
    private readonly vehicles: VehicleCatalogQuery,
    @Inject(CUSTOMER_CONTACT_QUERY)
    private readonly customers: CustomerContactQuery,
  ) {}

  async findForServiceOrder(
    serviceOrderId: string,
  ): Promise<QuotationRecipient | null> {
    const order = await this.orders.findById(serviceOrderId);
    if (!order) return null;

    const vehicle = await this.vehicles.findById(order.vehicleId);
    if (!vehicle) return null;

    const customer = await this.customers.findById(vehicle.ownerId);
    if (!customer) return null;

    return {
      customerId: customer.id,
      name: customer.name,
      email: customer.email,
      // Structured, not a pre-formatted label: how a car is written out is a
      // decision for whoever is drawing the email.
      vehicle: {
        manufacturer: vehicle.manufacturer,
        model: vehicle.model,
        year: vehicle.year,
        licensePlate: vehicle.licensePlate,
      },
    };
  }
}
