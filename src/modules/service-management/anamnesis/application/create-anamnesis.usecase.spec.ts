import { CreateServiceOrderUseCase } from '../../service-orders/application/create-service-order.usecase';
import { ServiceOrder } from '../../service-orders/domain/service-order.entity';
import { VehicleNotFoundError } from '../../service-orders/domain/errors/vehicle-not-found.error';
import type { AnamnesisRepository } from '../domain/anamnesis.repository';
import { CreateAnamnesisUseCase } from './create-anamnesis.usecase';

const vehicleId = '11111111-1111-1111-1111-111111111111';
const consultantId = '22222222-2222-4222-8222-222222222222';

describe('CreateAnamnesisUseCase', () => {
  let anamnesisRepository: AnamnesisRepository;
  let createOrder: CreateServiceOrderUseCase;
  let useCase: CreateAnamnesisUseCase;

  beforeEach(() => {
    anamnesisRepository = {
      findByServiceOrderId: jest.fn(),
      save: jest.fn(),
    };
    createOrder = { execute: jest.fn() } as unknown as CreateServiceOrderUseCase;
    useCase = new CreateAnamnesisUseCase(anamnesisRepository, createOrder);
  });

  it('creates the service order and attaches the anamnesis to it', async () => {
    const order = ServiceOrder.create({ vehicleId });
    (createOrder.execute as jest.Mock).mockResolvedValue(order);

    const anamnesis = await useCase.execute({
      vehicleId,
      consultantId,
      mainComplaint: 'Barulho na suspensão',
      problemDescription: 'Estalo ao passar em lombadas',
    });

    expect(createOrder.execute).toHaveBeenCalledWith({ vehicleId });
    expect(anamnesis.serviceOrderId).toBe(order.id);
    expect(anamnesis.consultantId).toBe(consultantId);
    expect(anamnesis.mainComplaint).toBe('Barulho na suspensão');
    expect(anamnesisRepository.save).toHaveBeenCalledWith(anamnesis);
  });

  it('propagates VehicleNotFoundError when the vehicle does not exist', async () => {
    (createOrder.execute as jest.Mock).mockRejectedValue(
      new VehicleNotFoundError(vehicleId),
    );

    await expect(
      useCase.execute({
        vehicleId,
        consultantId,
        mainComplaint: 'Barulho',
        problemDescription: 'Estalo',
      }),
    ).rejects.toThrow(VehicleNotFoundError);
    expect(anamnesisRepository.save).not.toHaveBeenCalled();
  });

  it('does not save the anamnesis when the order creation fails', async () => {
    (createOrder.execute as jest.Mock).mockRejectedValue(new Error('boom'));

    await expect(
      useCase.execute({
        vehicleId,
        consultantId,
        mainComplaint: 'Barulho',
        problemDescription: 'Estalo',
      }),
    ).rejects.toThrow('boom');
    expect(anamnesisRepository.save).not.toHaveBeenCalled();
  });
});