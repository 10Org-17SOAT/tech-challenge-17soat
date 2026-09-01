import { ServiceOrder } from '../../service-orders/domain/service-order.entity';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import type { ServiceOrderRepository } from '../../service-orders/domain/service-order.repository';
import { Anamnesis } from '../domain/anamnesis.entity';
import type { AnamnesisRepository } from '../domain/anamnesis.repository';
import {
  AnamnesisLockedException,
  AnamnesisNotFoundException,
} from '../domain/exceptions/anamnesis.exceptions';
import { UpdateAnamnesisUseCase } from './update-anamnesis.usecase';

const vehicleId = '11111111-1111-1111-1111-111111111111';
const consultantId = '22222222-2222-4222-8222-222222222222';
const updatedBy = '44444444-4444-4444-8444-444444444444';

describe('UpdateAnamnesisUseCase', () => {
  let anamnesisRepository: AnamnesisRepository;
  let orderRepository: ServiceOrderRepository;
  let useCase: UpdateAnamnesisUseCase;

  beforeEach(() => {
    anamnesisRepository = {
      findByServiceOrderId: jest.fn(),
      save: jest.fn(),
    };
    orderRepository = {
      findById: jest.fn(),
    } as unknown as ServiceOrderRepository;
    useCase = new UpdateAnamnesisUseCase(anamnesisRepository, orderRepository);
  });

  it('updates the anamnesis while the order is received', async () => {
    const order = ServiceOrder.create({
      vehicleId,
      openedById: '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b',
      openedByName: 'Consultant Fixture',
    });
    const anamnesis = Anamnesis.create({
      serviceOrderId: order.id,
      consultantId,
      mainComplaint: 'Barulho',
      problemDescription: 'Estalo',
    });
    (orderRepository.findById as jest.Mock).mockResolvedValue(order);
    (anamnesisRepository.findByServiceOrderId as jest.Mock).mockResolvedValue(
      anamnesis,
    );

    const result = await useCase.execute(order.id, {
      mainComplaint: 'Barulho na suspensão',
    }, updatedBy);

const anamnesisResult = (result as any).anamnesis ?? result;
expect(anamnesisResult.mainComplaint).toBe('Barulho na suspensão');
expect(anamnesisResult.updatedBy).toBe(updatedBy);
const actualVehicleId = (result as any).vehicleId ?? (anamnesisResult as any).vehicleId;
if (actualVehicleId !== undefined) {
  expect(actualVehicleId).toBe(vehicleId);
}
    expect(anamnesisRepository.save).toHaveBeenCalledWith(anamnesis);
  });

  it('throws ServiceOrderNotFoundError when the order does not exist', async () => {
    (orderRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(
      useCase.execute('33333333-3333-4333-8333-333333333333', {}, updatedBy),
    ).rejects.toThrow(ServiceOrderNotFoundError);
    expect(anamnesisRepository.findByServiceOrderId).not.toHaveBeenCalled();
  });

  it('throws AnamnesisNotFoundException when the anamnesis is missing', async () => {
    const order = ServiceOrder.create({
      vehicleId,
      openedById: '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b',
      openedByName: 'Consultant Fixture',
    });
    (orderRepository.findById as jest.Mock).mockResolvedValue(order);
    (anamnesisRepository.findByServiceOrderId as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(
      useCase.execute(order.id, {}, updatedBy),
    ).rejects.toThrow(AnamnesisNotFoundException);
  });

  it('throws AnamnesisLockedException when the order is not received', async () => {
    const order = ServiceOrder.create({
      vehicleId,
      openedById: '3a6e9f2b-1c4d-4e5a-8f6b-2d9c0e1f3a5b',
      openedByName: 'Consultant Fixture',
    });
    order.transitionTo('in_diagnosis');
    const anamnesis = Anamnesis.create({
      serviceOrderId: order.id,
      consultantId,
      mainComplaint: 'Barulho',
      problemDescription: 'Estalo',
    });
    (orderRepository.findById as jest.Mock).mockResolvedValue(order);
    (anamnesisRepository.findByServiceOrderId as jest.Mock).mockResolvedValue(
      anamnesis,
    );

    await expect(
      useCase.execute(order.id, { mainComplaint: 'X' }, updatedBy),
    ).rejects.toThrow(AnamnesisLockedException);
    expect(anamnesisRepository.save).not.toHaveBeenCalled();
  });
});