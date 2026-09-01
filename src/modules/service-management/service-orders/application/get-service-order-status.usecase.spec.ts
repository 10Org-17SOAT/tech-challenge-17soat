import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../domain/service-order.entity';
import { InMemoryCustomerContactQuery } from '../../../onboarding/customer/__test__/in-memory-customer-contact.query';
import { InMemoryVehicleCatalogQuery } from '../../../onboarding/vehicles/__test__/in-memory-vehicle-catalog.query';
import { InMemoryServiceOrderRepository } from '../__test__/in-memory-service-order.repository';
import { GetServiceOrderStatusUseCase } from './get-service-order-status.usecase';

// Orders always reference a vehicle; which one is irrelevant here.
const VEHICLE_ID = '9f1d3c40-5f0e-4a1e-9a1b-6c2d7e8f0a11';
const OPENED_BY_ID = '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b';
const OPENED_BY_NAME = 'Consultant Fixture';
const OWNER_ID = '5d2b8a71-3e4f-4c6d-9a8b-7f1e0c2d4b63';
const OWNER_USER_ID = '8c4f1e2d-6a7b-4c9d-8e0f-1a2b3c4d5e6f';
const STRANGER_USER_ID = '1b2c3d4e-5f60-4718-8293-a4b5c6d7e8f9';

describe('GetServiceOrderStatusUseCase', () => {
  let repository: InMemoryServiceOrderRepository;
  let customers: InMemoryCustomerContactQuery;
  let vehicles: InMemoryVehicleCatalogQuery;
  let useCase: GetServiceOrderStatusUseCase;

  beforeEach(() => {
    repository = new InMemoryServiceOrderRepository();
    customers = new InMemoryCustomerContactQuery();
    vehicles = new InMemoryVehicleCatalogQuery();
    useCase = new GetServiceOrderStatusUseCase(repository, customers, vehicles);

    customers.add(
      { id: OWNER_ID, name: 'Ana Souza', email: 'ana@example.com' },
      OWNER_USER_ID,
    );
    vehicles.add({
      id: VEHICLE_ID,
      ownerId: OWNER_ID,
      manufacturer: 'Fiat',
      model: 'Uno',
      year: 2018,
      licensePlate: 'ABC-1234',
    });
  });

  const givenOrder = async (): Promise<ServiceOrder> => {
    const order = ServiceOrder.create({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      openedByName: OPENED_BY_NAME,
    });
    await repository.save(order);
    return order;
  };

  it('returns the status of an existing order', async () => {
    const order = ServiceOrder.create({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      openedByName: OPENED_BY_NAME,
    });
    await repository.save(order);

    await expect(useCase.execute(order.id)).resolves.toBe('received');
  });

  it('throws when the order does not exist', async () => {
    await expect(useCase.execute(crypto.randomUUID())).rejects.toBeInstanceOf(
      ServiceOrderNotFoundError,
    );
  });

  it('throws when the order was soft deleted', async () => {
    const order = ServiceOrder.create({
      vehicleId: VEHICLE_ID,
      openedById: OPENED_BY_ID,
      openedByName: OPENED_BY_NAME,
    });
    await repository.save(order);
    order.delete();
    await repository.save(order);

    await expect(useCase.execute(order.id)).rejects.toBeInstanceOf(
      ServiceOrderNotFoundError,
    );
  });

  describe('ownership', () => {
    it('lets the owner read the status of their own order', async () => {
      const order = await givenOrder();

      await expect(useCase.execute(order.id, OWNER_USER_ID)).resolves.toBe(
        'received',
      );
    });

    // Reported as missing, not forbidden: a 403 would confirm the id exists.
    it('hides an order that belongs to someone else', async () => {
      const order = await givenOrder();

      await expect(
        useCase.execute(order.id, STRANGER_USER_ID),
      ).rejects.toBeInstanceOf(ServiceOrderNotFoundError);
    });

    // `user_id` is nullable on customers, so an account may own nothing at all.
    it('hides the order from an account with no customer linked', async () => {
      const order = await givenOrder();

      await expect(
        useCase.execute(order.id, '0f0e0d0c-0b0a-4908-8706-050403020100'),
      ).rejects.toBeInstanceOf(ServiceOrderNotFoundError);
    });

    it('hides the order when its vehicle cannot be resolved', async () => {
      const order = ServiceOrder.create({
        vehicleId: '7e6d5c4b-3a29-4180-9f7e-6d5c4b3a2918',
        openedById: OPENED_BY_ID,
        openedByName: OPENED_BY_NAME,
      });
      await repository.save(order);

      await expect(
        useCase.execute(order.id, OWNER_USER_ID),
      ).rejects.toBeInstanceOf(ServiceOrderNotFoundError);
    });

    // An admin passes no requester and keeps seeing everything.
    it('skips the check when no requester is given', async () => {
      const order = await givenOrder();

      await expect(useCase.execute(order.id)).resolves.toBe('received');
    });
  });
});
