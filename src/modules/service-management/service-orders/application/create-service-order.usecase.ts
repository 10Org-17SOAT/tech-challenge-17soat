import { Inject, Injectable } from '@nestjs/common';
import { CONSULTANT_DIRECTORY_QUERY } from '../../../onboarding/consultant/public/consultant-directory.query';
import type { ConsultantDirectoryQuery } from '../../../onboarding/consultant/public/consultant-directory.query';
import { CUSTOMER_CONTACT_QUERY } from '../../../onboarding/customer/public/customer-contact.query';
import type { CustomerContactQuery } from '../../../onboarding/customer/public/customer-contact.query';
import { CUSTOMER_REGISTRATION } from '../../../onboarding/customer/public/customer-registration';
import type {
  CustomerRegistration,
  NewCustomer,
} from '../../../onboarding/customer/public/customer-registration';
import { VEHICLE_CATALOG_QUERY } from '../../../onboarding/vehicles/public/vehicle-catalog.query';
import type { VehicleCatalogQuery } from '../../../onboarding/vehicles/public/vehicle-catalog.query';
import { VEHICLE_REGISTRATION } from '../../../onboarding/vehicles/public/vehicle-registration';
import type {
  NewVehicle,
  VehicleRegistration,
} from '../../../onboarding/vehicles/public/vehicle-registration';
import { SUPPLY_CATALOG_QUERY } from '../../../stock/public/supply-catalog.query';
import type { SupplyCatalogQuery } from '../../../stock/public/supply-catalog.query';
import { SERVICE_REPOSITORY } from '../../services/domain/service.repository';
import type { ServiceRepository } from '../../services/domain/service.repository';
import { ConsultantNotFoundForServiceOrderError } from '../domain/errors/consultant-not-found-for-service-order.error';
import { CustomerNotFoundForServiceOrderError } from '../domain/errors/customer-not-found-for-service-order.error';
import { PartsNotFoundForServiceOrderError } from '../domain/errors/parts-not-found-for-service-order.error';
import { ServicesNotFoundForServiceOrderError } from '../domain/errors/services-not-found-for-service-order.error';
import { VehicleNotFoundForServiceOrderError } from '../domain/errors/vehicle-not-found-for-service-order.error';
import { VehicleNotOwnedByCustomerError } from '../domain/errors/vehicle-not-owned-by-customer.error';
import { RequestedPart } from '../domain/requested-items';
import type { RequestedItems } from '../domain/requested-items';
import { ServiceItem } from '../domain/service-item';
import { ServiceOrder } from '../domain/service-order.entity';
import { SERVICE_ORDER_REPOSITORY } from '../domain/service-order.repository';
import type { ServiceOrderRepository } from '../domain/service-order.repository';

/** Either a reference to someone already registered, or the data to register them. */
export type CustomerInput = { id: string } | { data: NewCustomer };
export type VehicleInput =
  { id: string } | { data: Omit<NewVehicle, 'ownerId'> };

export interface CreateServiceOrderInput {
  openedById: string;
  customer: CustomerInput;
  vehicle: VehicleInput;
  services: { serviceId: string; quantity: number }[];
  parts: { supplyId: string; quantity: number }[];
  notes?: string | null;
  vehicleMileageAtEntry?: number | null;
  scheduledAt?: Date | null;
}

export interface CreateServiceOrderOutput {
  order: ServiceOrder;
  customerId: string;
  requestedItems: RequestedItems;
}

interface Pending {
  id: string;
  commit(): Promise<void>;
}

const nothingToWrite = () => Promise.resolve();

/**
 * Reception opening an order: who brought the car, which car, and what they
 * asked for. Customer and vehicle are reused when they exist and registered
 * when they do not.
 *
 * Same discipline as approving a quotation: everything that can be rejected
 * is resolved and validated first, and only then is anything written. A
 * rejected request leaves no new customer or vehicle behind. There is no
 * transaction, so a database failure between the writes can still leave the
 * customer or vehicle registered without the order — harmless, since the next
 * attempt reuses them by document and plate.
 */
@Injectable()
export class CreateServiceOrderUseCase {
  constructor(
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
    @Inject(CONSULTANT_DIRECTORY_QUERY)
    private readonly consultants: ConsultantDirectoryQuery,
    @Inject(CUSTOMER_CONTACT_QUERY)
    private readonly customers: CustomerContactQuery,
    @Inject(CUSTOMER_REGISTRATION)
    private readonly customerRegistration: CustomerRegistration,
    @Inject(VEHICLE_CATALOG_QUERY)
    private readonly vehicles: VehicleCatalogQuery,
    @Inject(VEHICLE_REGISTRATION)
    private readonly vehicleRegistration: VehicleRegistration,
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

    const customer = await this.resolveCustomer(input.customer);
    const vehicle = await this.resolveVehicle(input.vehicle, customer.id);
    const requestedItems = await this.resolveRequestedItems(input);

    const order = ServiceOrder.create({
      vehicleId: vehicle.id,
      openedById: consultant.id,
      openedByName: consultant.name,
      notes: input.notes,
      vehicleMileageAtEntry: input.vehicleMileageAtEntry,
      scheduledAt: input.scheduledAt,
    });

    // Parents before children: each write's foreign key points at the one
    // before it.
    await customer.commit();
    await vehicle.commit();
    await this.orderRepository.save(order);
    await this.orderRepository.saveRequestedItems(order.id, requestedItems);

    return { order, customerId: customer.id, requestedItems };
  }

  private async resolveCustomer(input: CustomerInput): Promise<Pending> {
    if ('id' in input) {
      const existing = await this.customers.findById(input.id);
      if (!existing) {
        throw new CustomerNotFoundForServiceOrderError(input.id);
      }
      return { id: existing.id, commit: nothingToWrite };
    }

    const pending = await this.customerRegistration.prepare(input.data);
    return { id: pending.customerId, commit: () => pending.commit() };
  }

  private async resolveVehicle(
    input: VehicleInput,
    customerId: string,
  ): Promise<Pending> {
    if ('id' in input) {
      const existing = await this.vehicles.findById(input.id);
      if (!existing) {
        throw new VehicleNotFoundForServiceOrderError(input.id);
      }
      // The customer is derived from the vehicle downstream (quotation email,
      // ownership checks), so the two must agree here.
      if (existing.ownerId !== customerId) {
        throw new VehicleNotOwnedByCustomerError(existing.id, customerId);
      }
      return { id: existing.id, commit: nothingToWrite };
    }

    const pending = await this.vehicleRegistration.prepare({
      ...input.data,
      ownerId: customerId,
    });
    return { id: pending.vehicleId, commit: () => pending.commit() };
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
