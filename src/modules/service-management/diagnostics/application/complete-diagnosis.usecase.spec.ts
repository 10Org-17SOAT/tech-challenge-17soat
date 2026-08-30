import { IssueQuotationUseCase } from '../../quotations/application/issue-quotation.usecase';
import { PartUnavailableForQuotationError } from '../../quotations/domain/errors/part-unavailable-for-quotation.error';
import { InMemoryPartCatalog } from '../../quotations/__test__/in-memory-part-catalog';
import { InMemoryQuotationRepository } from '../../quotations/__test__/in-memory-quotation.repository';
import { InvalidServiceOrderTransitionError } from '../../service-orders/domain/errors/invalid-service-order-transition.error';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { ServiceOrder } from '../../service-orders/domain/service-order.entity';
import { InMemoryServiceOrderRepository } from '../../service-orders/__test__/in-memory-service-order.repository';
import { Service } from '../../services/domain/service.entity';
import { InMemoryServiceRepository } from '../../services/__test__/in-memory-service.repository';
import { InvalidDiagnosisError } from '../domain/errors/invalid-diagnosis.error';
import { InMemoryDiagnosisRepository } from '../__test__/in-memory-diagnosis.repository';
import { CompleteDiagnosisUseCase } from './complete-diagnosis.usecase';

const oilId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';

describe('CompleteDiagnosisUseCase', () => {
  let diagnoses: InMemoryDiagnosisRepository;
  let orders: InMemoryServiceOrderRepository;
  let services: InMemoryServiceRepository;
  let quotations: InMemoryQuotationRepository;
  let parts: InMemoryPartCatalog;
  let useCase: CompleteDiagnosisUseCase;
  let service: Service;

  beforeEach(async () => {
    diagnoses = new InMemoryDiagnosisRepository();
    orders = new InMemoryServiceOrderRepository();
    services = new InMemoryServiceRepository();
    quotations = new InMemoryQuotationRepository();
    parts = new InMemoryPartCatalog();
    parts.add({ id: oilId, name: 'Oleo 5W30', priceInCents: 4500 });

    useCase = new CompleteDiagnosisUseCase(
      diagnoses,
      orders,
      new IssueQuotationUseCase(quotations, orders, services, parts),
    );

    service = Service.create({
      name: 'Troca de oleo',
      category: 'mechanical',
      laborPriceInCents: 9990,
    });
    await services.save(service);
    await services.replaceSupplies(service.id, [
      { supplyId: oilId, quantity: 4 },
    ]);
  });

  const givenOrderInDiagnosis = async (): Promise<ServiceOrder> => {
    const order = ServiceOrder.create({});
    order.transitionTo('in_diagnosis');
    await orders.save(order);
    return order;
  };

  it('records the diagnosis, the scope and the quotation, then advances the order', async () => {
    const order = await givenOrderInDiagnosis();

    const { diagnosis, quotation } = await useCase.execute({
      serviceOrderId: order.id,
      findings: 'Pastilhas gastas',
      serviceItems: [{ serviceId: service.id, quantity: 1 }],
    });

    expect(diagnosis.findings).toBe('Pastilhas gastas');
    expect(quotation.totalInCents).toBe(9990 + 4500 * 4);
    expect(await orders.findItems(order.id)).toHaveLength(1);
    expect(orders.orders.get(order.id)!.status).toBe('awaiting_approval');
  });

  // The whole point of generating the quotation here: the order never sits in
  // awaiting_approval with nothing for the customer to approve.
  it('always leaves awaiting_approval with a quotation attached', async () => {
    const order = await givenOrderInDiagnosis();

    await useCase.execute({
      serviceOrderId: order.id,
      findings: 'Pastilhas gastas',
      serviceItems: [{ serviceId: service.id, quantity: 1 }],
    });

    expect(orders.orders.get(order.id)!.status).toBe('awaiting_approval');
    expect(await quotations.findByServiceOrderId(order.id)).not.toBeNull();
  });

  it('does not advance the order when pricing fails', async () => {
    const order = await givenOrderInDiagnosis();
    await services.replaceSupplies(service.id, [
      { supplyId: 'cccccccc-cccc-cccc-cccc-cccccccccccc', quantity: 1 },
    ]);
    // The status is written last, so a pricing failure must never reach it.
    // Asserted on the write because the in-memory repository is an identity
    // map: the entity is mutated before pricing and the fake would show it.
    const saveOrder = jest.spyOn(orders, 'save');

    await expect(
      useCase.execute({
        serviceOrderId: order.id,
        findings: 'Pastilhas gastas',
        serviceItems: [{ serviceId: service.id, quantity: 1 }],
      }),
    ).rejects.toThrow(PartUnavailableForQuotationError);

    expect(saveOrder).not.toHaveBeenCalled();
    expect(await quotations.findByServiceOrderId(order.id)).toBeNull();
  });

  it('rejects blank findings before writing anything', async () => {
    const order = await givenOrderInDiagnosis();
    const saveDiagnosis = jest.spyOn(diagnoses, 'save');

    await expect(
      useCase.execute({
        serviceOrderId: order.id,
        findings: '   ',
        serviceItems: [{ serviceId: service.id, quantity: 1 }],
      }),
    ).rejects.toThrow(InvalidDiagnosisError);

    expect(saveDiagnosis).not.toHaveBeenCalled();
    expect(orders.orders.get(order.id)!.status).toBe('in_diagnosis');
  });

  it('refuses when the order is not in diagnosis', async () => {
    const order = ServiceOrder.create({});
    await orders.save(order);
    const saveDiagnosis = jest.spyOn(diagnoses, 'save');

    await expect(
      useCase.execute({
        serviceOrderId: order.id,
        findings: 'Pastilhas gastas',
        serviceItems: [{ serviceId: service.id, quantity: 1 }],
      }),
    ).rejects.toThrow(InvalidServiceOrderTransitionError);

    expect(saveDiagnosis).not.toHaveBeenCalled();
  });

  it('throws for an unknown order', async () => {
    await expect(
      useCase.execute({
        serviceOrderId: '99999999-9999-9999-9999-999999999999',
        findings: 'Pastilhas gastas',
        serviceItems: [{ serviceId: service.id, quantity: 1 }],
      }),
    ).rejects.toThrow(ServiceOrderNotFoundError);
  });
});
