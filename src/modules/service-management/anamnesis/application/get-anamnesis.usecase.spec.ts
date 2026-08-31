import { ServiceOrder } from '../../service-orders/domain/service-order.entity';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import type { ServiceOrderRepository } from '../../service-orders/domain/service-order.repository';
import { Anamnesis } from '../domain/anamnesis.entity';
import type { AnamnesisRepository } from '../domain/anamnesis.repository';
import { AnamnesisNotFoundException } from '../domain/exceptions/anamnesis.exceptions';
import { GetAnamnesisUseCase } from './get-anamnesis.usecase';

const vehicleId = '11111111-1111-1111-1111-111111111111';
const consultantId = '22222222-2222-4222-8222-222222222222';

describe('GetAnamnesisUseCase', () => {
  let anamnesisRepository: AnamnesisRepository;
  let orderRepository: ServiceOrderRepository;
  let useCase: GetAnamnesisUseCase;

  beforeEach(() => {
    anamnesisRepository = {
      findByServiceOrderId: jest.fn(),
      save: jest.fn(),
    };
    orderRepository = {
      findById: jest.fn(),
    } as unknown as ServiceOrderRepository;
    useCase = new GetAnamnesisUseCase(anamnesisRepository, orderRepository);
  });

  it('returns the anamnesis for an existing order', async () => {
    const order = ServiceOrder.create({ vehicleId });
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

    await expect(useCase.execute(order.id)).resolves.toBe(anamnesis);
  });

  it('throws ServiceOrderNotFoundError when the order does not exist', async () => {
    (orderRepository.findById as jest.Mock).mockResolvedValue(null);

    await expect(useCase.execute('33333333-3333-4333-8333-333333333333')).rejects.toThrow(
      ServiceOrderNotFoundError,
    );
    expect(anamnesisRepository.findByServiceOrderId).not.toHaveBeenCalled();
  });

  it('throws AnamnesisNotFoundException when the anamnesis is missing', async () => {
    const order = ServiceOrder.create({ vehicleId });
    (orderRepository.findById as jest.Mock).mockResolvedValue(order);
    (anamnesisRepository.findByServiceOrderId as jest.Mock).mockResolvedValue(
      null,
    );

    await expect(useCase.execute(order.id)).rejects.toThrow(
      AnamnesisNotFoundException,
    );
  });
});