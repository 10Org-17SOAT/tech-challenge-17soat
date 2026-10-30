import { InMemoryConsultantDirectoryQuery } from '../../../onboarding/consultant/__test__/in-memory-consultant-directory.query';
import { InMemoryServiceOrderRepository } from '../../service-orders/__test__/in-memory-service-order.repository';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../../service-orders/domain/service-order.entity';
import { Anamnesis } from '../domain/anamnesis.entity';
import type { AnamnesisRepository } from '../domain/anamnesis.repository';
import {
  AnamnesisAlreadyExistsException,
  AnamnesisConsultantNotFoundException,
  AnamnesisLockedException,
} from '../domain/exceptions/anamnesis.exceptions';
import { CreateAnamnesisUseCase } from './create-anamnesis.usecase';

const vehicleId = '11111111-1111-1111-1111-111111111111';
const consultantId = '22222222-2222-4222-8222-222222222222';
const unknownId = 'f0000000-0000-4000-8000-000000000000';

describe('CreateAnamnesisUseCase', () => {
  let anamnesisRepository: AnamnesisRepository;
  let orders: InMemoryServiceOrderRepository;
  let consultants: InMemoryConsultantDirectoryQuery;
  let useCase: CreateAnamnesisUseCase;
  let order: ServiceOrder;

  beforeEach(async () => {
    anamnesisRepository = {
      findByServiceOrderId: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    };
    orders = new InMemoryServiceOrderRepository();
    consultants = new InMemoryConsultantDirectoryQuery();
    consultants.add({ id: consultantId, name: 'Carlos' });
    order = ServiceOrder.create({
      vehicleId,
      openedById: consultantId,
      openedByName: 'Carlos',
    });
    await orders.save(order);
    useCase = new CreateAnamnesisUseCase(
      anamnesisRepository,
      orders,
      consultants,
    );
  });

  const input = (serviceOrderId: string, overrides = {}) => ({
    serviceOrderId,
    consultantId,
    mainComplaint: 'Barulho na suspensão',
    problemDescription: 'Estalo ao passar em lombadas',
    ...overrides,
  });

  it('attaches the anamnesis to an existing order in received', async () => {
    const { anamnesis, vehicleId: resultVehicleId } = await useCase.execute(
      input(order.id),
    );

    expect(resultVehicleId).toBe(vehicleId);
    expect(anamnesis.serviceOrderId).toBe(order.id);
    expect(anamnesis.consultantId).toBe(consultantId);
    expect(anamnesis.mainComplaint).toBe('Barulho na suspensão');
    expect(anamnesisRepository.save).toHaveBeenCalledWith(anamnesis);
    // It no longer opens orders of its own.
    expect(orders.orders.size).toBe(1);
  });

  it('rejects an order that does not exist', async () => {
    await expect(useCase.execute(input(unknownId))).rejects.toThrow(
      ServiceOrderNotFoundError,
    );
    expect(anamnesisRepository.save).not.toHaveBeenCalled();
  });

  it('rejects an order that already left received', async () => {
    order.transitionTo('in_diagnosis');

    await expect(useCase.execute(input(order.id))).rejects.toThrow(
      AnamnesisLockedException,
    );
    expect(anamnesisRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a second anamnesis for the same order', async () => {
    (anamnesisRepository.findByServiceOrderId as jest.Mock).mockResolvedValue(
      Anamnesis.create(input(order.id)),
    );

    await expect(useCase.execute(input(order.id))).rejects.toThrow(
      AnamnesisAlreadyExistsException,
    );
    expect(anamnesisRepository.save).not.toHaveBeenCalled();
  });

  it('rejects a consultant that is not registered', async () => {
    await expect(
      useCase.execute(input(order.id, { consultantId: unknownId })),
    ).rejects.toThrow(AnamnesisConsultantNotFoundException);
    expect(anamnesisRepository.save).not.toHaveBeenCalled();
  });
});
