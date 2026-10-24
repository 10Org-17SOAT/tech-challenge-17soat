import { InMemoryConsultantDirectoryQuery } from '../../../onboarding/consultant/__test__/in-memory-consultant-directory.query';
import { InMemoryCustomerContactQuery } from '../../../onboarding/customer/__test__/in-memory-customer-contact.query';
import {
  CustomerRegistrationRejectedError,
  type CustomerRegistration,
  type NewCustomer,
} from '../../../onboarding/customer/public/customer-registration';
import { InMemoryVehicleCatalogQuery } from '../../../onboarding/vehicles/__test__/in-memory-vehicle-catalog.query';
import {
  LicensePlateTakenError,
  type NewVehicle,
  type VehicleRegistration,
} from '../../../onboarding/vehicles/public/vehicle-registration';
import type {
  SupplyCatalogQuery,
  SupplyView,
} from '../../../stock/public/supply-catalog.query';
import { InMemoryServiceRepository } from '../../services/__test__/in-memory-service.repository';
import { Service } from '../../services/domain/service.entity';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { ConsultantNotFoundForServiceOrderError } from '../domain/errors/consultant-not-found-for-service-order.error';
import { CustomerNotFoundForServiceOrderError } from '../domain/errors/customer-not-found-for-service-order.error';
import { InvalidServiceOrderError } from '../domain/errors/invalid-service-order.error';
import { PartsNotFoundForServiceOrderError } from '../domain/errors/parts-not-found-for-service-order.error';
import { ServicesNotFoundForServiceOrderError } from '../domain/errors/services-not-found-for-service-order.error';
import { VehicleNotFoundForServiceOrderError } from '../domain/errors/vehicle-not-found-for-service-order.error';
import { VehicleNotOwnedByCustomerError } from '../domain/errors/vehicle-not-owned-by-customer.error';
import {
  CreateServiceOrderUseCase,
  type CreateServiceOrderInput,
} from './create-service-order.usecase';

const OPENED_BY_ID = '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b';
const OPENED_BY_NAME = 'Consultant Fixture';
const CUSTOMER_ID = '8b0f5d6e-2a1c-4f3e-9d7b-1c2e3f4a5b6c';
const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';
const SUPPLY_ID = 'd4e5f6a7-b8c9-4d0e-8f1a-2b3c4d5e6f70';
const UNKNOWN_ID = 'f0000000-0000-4000-8000-000000000000';

/** Records what was prepared and committed, so tests can prove nothing was written. */
class FakeCustomerRegistration implements CustomerRegistration {
  readonly committed: string[] = [];
  existingByDocument = new Map<string, string>();
  rejectWith: Error | null = null;

  prepare(customer: NewCustomer) {
    if (this.rejectWith) return Promise.reject(this.rejectWith);
    const existing = this.existingByDocument.get(customer.document);
    const customerId = existing ?? 'c0000000-0000-4000-8000-00000000000a';
    return Promise.resolve({
      customerId,
      isNew: !existing,
      commit: () => {
        if (!existing) this.committed.push(customerId);
        return Promise.resolve();
      },
    });
  }
}

class FakeVehicleRegistration implements VehicleRegistration {
  readonly committed: NewVehicle[] = [];
  rejectWith: Error | null = null;

  prepare(vehicle: NewVehicle) {
    if (this.rejectWith) return Promise.reject(this.rejectWith);
    return Promise.resolve({
      vehicleId: 'a0000000-0000-4000-8000-00000000000b',
      isNew: true,
      commit: () => {
        this.committed.push(vehicle);
        return Promise.resolve();
      },
    });
  }
}

class FakeSupplyCatalog implements SupplyCatalogQuery {
  readonly supplies = new Map<string, SupplyView>();

  findManyByIds(ids: string[]): Promise<Map<string, SupplyView>> {
    return Promise.resolve(
      new Map(
        ids
          .filter((id) => this.supplies.has(id))
          .map((id) => [id, this.supplies.get(id)!]),
      ),
    );
  }
}

const newCustomer: NewCustomer = {
  userId: '5e6f7a8b-9c0d-4e1f-8a2b-3c4d5e6f7a8b',
  personType: 'CPF',
  document: '52998224725',
  name: 'Ana Souza',
  email: 'ana@example.com',
  phone: { countryCode: '55', areaCode: '11', number: '999998888' },
  address: {
    street: 'Rua das Flores',
    number: '100',
    neighborhood: 'Centro',
    city: 'Sao Paulo',
    state: 'SP',
    zipCode: '01001000',
  },
};

const newVehicle: Omit<NewVehicle, 'ownerId'> = {
  licensePlate: 'ABC1D23',
  model: 'Uno',
  year: 2018,
  manufacturer: 'Fiat',
  color: 'Prata',
  fuelType: 'GASOLINE',
  odometer: 45000,
};

describe('CreateServiceOrderUseCase', () => {
  let orders: InMemoryServiceOrderRepository;
  let consultants: InMemoryConsultantDirectoryQuery;
  let customers: InMemoryCustomerContactQuery;
  let customerRegistration: FakeCustomerRegistration;
  let vehicles: InMemoryVehicleCatalogQuery;
  let vehicleRegistration: FakeVehicleRegistration;
  let services: InMemoryServiceRepository;
  let supplies: FakeSupplyCatalog;
  let useCase: CreateServiceOrderUseCase;
  let serviceId: string;

  beforeEach(async () => {
    orders = new InMemoryServiceOrderRepository();
    consultants = new InMemoryConsultantDirectoryQuery();
    consultants.add({ id: OPENED_BY_ID, name: OPENED_BY_NAME });
    customers = new InMemoryCustomerContactQuery();
    customers.add({ id: CUSTOMER_ID, name: 'Ana', email: 'ana@example.com' });
    customerRegistration = new FakeCustomerRegistration();
    vehicles = new InMemoryVehicleCatalogQuery();
    vehicles.add({
      id: VEHICLE_ID,
      ownerId: CUSTOMER_ID,
      manufacturer: 'Fiat',
      model: 'Uno',
      year: 2018,
      licensePlate: 'ABC-1234',
    });
    vehicleRegistration = new FakeVehicleRegistration();
    services = new InMemoryServiceRepository();
    const service = Service.create({
      name: 'Alinhamento',
      category: 'mechanical',
      laborPriceInCents: 10000,
    });
    await services.save(service);
    serviceId = service.id;
    supplies = new FakeSupplyCatalog();
    supplies.supplies.set(SUPPLY_ID, {
      id: SUPPLY_ID,
      name: 'Óleo 5W30',
      priceInCents: 4500,
    });

    useCase = new CreateServiceOrderUseCase(
      orders,
      consultants,
      customers,
      customerRegistration,
      vehicles,
      vehicleRegistration,
      services,
      supplies,
    );
  });

  const input = (
    overrides: Partial<CreateServiceOrderInput> = {},
  ): CreateServiceOrderInput => ({
    openedById: OPENED_BY_ID,
    customer: { id: CUSTOMER_ID },
    vehicle: { id: VEHICLE_ID },
    services: [{ serviceId, quantity: 1 }],
    parts: [{ supplyId: SUPPLY_ID, quantity: 4 }],
    ...overrides,
  });

  const expectNothingWritten = async () => {
    const { total } = await orders.findMany({ page: 1, limit: 10 });
    expect(total).toBe(0);
    expect(orders.requestedItems.size).toBe(0);
    expect(customerRegistration.committed).toHaveLength(0);
    expect(vehicleRegistration.committed).toHaveLength(0);
  };

  describe('with an existing customer and vehicle', () => {
    it('opens the order in received with the requested items', async () => {
      const { order, customerId, requestedItems } = await useCase.execute(
        input({ notes: 'barulho', vehicleMileageAtEntry: 45000 }),
      );

      expect(order.status).toBe('received');
      expect(order.vehicleId).toBe(VEHICLE_ID);
      expect(order.openedById).toBe(OPENED_BY_ID);
      expect(order.openedByName).toBe(OPENED_BY_NAME);
      expect(order.notes).toBe('barulho');
      expect(order.vehicleMileageAtEntry).toBe(45000);
      expect(customerId).toBe(CUSTOMER_ID);
      await expect(orders.findById(order.id)).resolves.toBe(order);

      const saved = await orders.findRequestedItems(order.id);
      expect(saved).toEqual(requestedItems);
      expect(saved.services.map((s) => [s.serviceId, s.quantity])).toEqual([
        [serviceId, 1],
      ]);
      expect(saved.parts.map((p) => [p.supplyId, p.quantity])).toEqual([
        [SUPPLY_ID, 4],
      ]);
    });

    it('accepts an order with nothing requested yet', async () => {
      const { order, requestedItems } = await useCase.execute(
        input({ services: [], parts: [] }),
      );
      expect(order.status).toBe('received');
      expect(requestedItems).toEqual({ services: [], parts: [] });
    });

    it('does not touch the registrations', async () => {
      await useCase.execute(input());
      expect(customerRegistration.committed).toHaveLength(0);
      expect(vehicleRegistration.committed).toHaveLength(0);
    });
  });

  describe('registering the customer and vehicle', () => {
    it('registers both and opens the order for the new vehicle', async () => {
      const { order, customerId } = await useCase.execute(
        input({
          customer: { data: newCustomer },
          vehicle: { data: newVehicle },
        }),
      );

      expect(customerRegistration.committed).toEqual([customerId]);
      // The new vehicle is registered to the customer resolved just before it.
      expect(vehicleRegistration.committed).toEqual([
        { ...newVehicle, ownerId: customerId },
      ]);
      expect(order.vehicleId).toBe('a0000000-0000-4000-8000-00000000000b');
    });

    it('reuses a customer whose document is already registered', async () => {
      customerRegistration.existingByDocument.set(
        newCustomer.document,
        CUSTOMER_ID,
      );

      const { customerId } = await useCase.execute(
        input({ customer: { data: newCustomer } }),
      );

      expect(customerId).toBe(CUSTOMER_ID);
      expect(customerRegistration.committed).toHaveLength(0);
    });

    it('registers a new vehicle for an existing customer', async () => {
      await useCase.execute(input({ vehicle: { data: newVehicle } }));
      expect(vehicleRegistration.committed).toEqual([
        { ...newVehicle, ownerId: CUSTOMER_ID },
      ]);
    });
  });

  // Every rejection below must leave nothing behind — no order, no requested
  // items, and no customer or vehicle registered on the way.
  describe('rejections', () => {
    const newEverything = {
      customer: { data: newCustomer },
      vehicle: { data: newVehicle },
    };

    it('refuses a consultant that is not registered', async () => {
      await expect(
        useCase.execute(input({ ...newEverything, openedById: UNKNOWN_ID })),
      ).rejects.toThrow(ConsultantNotFoundForServiceOrderError);
      await expectNothingWritten();
    });

    it('refuses a customer id that is not registered', async () => {
      await expect(
        useCase.execute(input({ customer: { id: UNKNOWN_ID } })),
      ).rejects.toThrow(CustomerNotFoundForServiceOrderError);
      await expectNothingWritten();
    });

    it('refuses a vehicle id that is not registered', async () => {
      await expect(
        useCase.execute(
          input({
            customer: { data: newCustomer },
            vehicle: { id: UNKNOWN_ID },
          }),
        ),
      ).rejects.toThrow(VehicleNotFoundForServiceOrderError);
      await expectNothingWritten();
    });

    it('refuses a vehicle that belongs to someone else', async () => {
      customers.add({ id: UNKNOWN_ID, name: 'Outro', email: 'o@example.com' });

      await expect(
        useCase.execute(input({ customer: { id: UNKNOWN_ID } })),
      ).rejects.toThrow(VehicleNotOwnedByCustomerError);
      await expectNothingWritten();
    });

    it('propagates invalid customer data', async () => {
      customerRegistration.rejectWith = new CustomerRegistrationRejectedError(
        'Invalid document',
      );
      await expect(
        useCase.execute(input({ customer: { data: newCustomer } })),
      ).rejects.toThrow(CustomerRegistrationRejectedError);
      await expectNothingWritten();
    });

    it('propagates a plate registered to another customer', async () => {
      vehicleRegistration.rejectWith = new LicensePlateTakenError('ABC1D23');
      await expect(useCase.execute(input(newEverything))).rejects.toThrow(
        LicensePlateTakenError,
      );
      await expectNothingWritten();
    });

    it('refuses services that are not in the catalogue, naming them', async () => {
      const result = useCase.execute(
        input({
          ...newEverything,
          services: [
            { serviceId, quantity: 1 },
            { serviceId: UNKNOWN_ID, quantity: 1 },
          ],
        }),
      );
      await expect(result).rejects.toThrow(
        ServicesNotFoundForServiceOrderError,
      );
      await expect(result).rejects.toMatchObject({ serviceIds: [UNKNOWN_ID] });
      await expectNothingWritten();
    });

    it('refuses parts that are not in stock, naming them', async () => {
      const result = useCase.execute(
        input({
          ...newEverything,
          parts: [{ supplyId: UNKNOWN_ID, quantity: 1 }],
        }),
      );
      await expect(result).rejects.toThrow(PartsNotFoundForServiceOrderError);
      await expect(result).rejects.toMatchObject({ supplyIds: [UNKNOWN_ID] });
      await expectNothingWritten();
    });

    it('refuses a non-positive quantity', async () => {
      await expect(
        useCase.execute(
          input({
            ...newEverything,
            parts: [{ supplyId: SUPPLY_ID, quantity: 0 }],
          }),
        ),
      ).rejects.toThrow(InvalidServiceOrderError);
      await expectNothingWritten();
    });

    it('refuses invalid order fields after resolving everything else', async () => {
      await expect(
        useCase.execute(input({ ...newEverything, vehicleMileageAtEntry: -1 })),
      ).rejects.toThrow(InvalidServiceOrderError);
      await expectNothingWritten();
    });
  });
});
