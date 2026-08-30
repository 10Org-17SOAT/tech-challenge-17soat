import { ServiceItem } from '../../service-orders/domain/service-item';
import { InMemoryServiceOrderRepository } from '../../service-orders/__test__/in-memory-service-order.repository';
import { Service } from '../../services/domain/service.entity';
import { InMemoryServiceRepository } from '../../services/__test__/in-memory-service.repository';
import { PartUnavailableForQuotationError } from '../domain/errors/part-unavailable-for-quotation.error';
import { ServiceUnavailableForQuotationError } from '../domain/errors/service-unavailable-for-quotation.error';
import { InvalidQuotationError } from '../domain/errors/invalid-quotation.error';
import { InMemoryPartCatalog } from '../__test__/in-memory-part-catalog';
import { InMemoryQuotationRepository } from '../__test__/in-memory-quotation.repository';
import { IssueQuotationUseCase } from './issue-quotation.usecase';

const serviceOrderId = '11111111-1111-1111-1111-111111111111';
const oilId = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
const filterId = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';

describe('IssueQuotationUseCase', () => {
  let quotations: InMemoryQuotationRepository;
  let orders: InMemoryServiceOrderRepository;
  let services: InMemoryServiceRepository;
  let parts: InMemoryPartCatalog;
  let useCase: IssueQuotationUseCase;

  beforeEach(() => {
    quotations = new InMemoryQuotationRepository();
    orders = new InMemoryServiceOrderRepository();
    services = new InMemoryServiceRepository();
    parts = new InMemoryPartCatalog();
    useCase = new IssueQuotationUseCase(quotations, orders, services, parts);

    parts.add({ id: oilId, name: 'Oleo 5W30', priceInCents: 4500 });
    parts.add({ id: filterId, name: 'Filtro de oleo', priceInCents: 3000 });
  });

  const givenService = async (
    name: string,
    laborPriceInCents: number,
    supplies: { supplyId: string; quantity: number }[] = [],
  ): Promise<Service> => {
    const service = Service.create({
      name,
      category: 'mechanical',
      laborPriceInCents,
    });
    await services.save(service);
    await services.replaceSupplies(service.id, supplies);
    return service;
  };

  const givenScope = async (
    items: { serviceId: string; quantity: number }[],
  ): Promise<void> => {
    await orders.replaceItems(
      serviceOrderId,
      items.map((item) => ServiceItem.create(item)),
    );
  };

  it('prices labour plus every part the services consume', async () => {
    const service = await givenService('Troca de oleo', 9990, [
      { supplyId: oilId, quantity: 4 },
      { supplyId: filterId, quantity: 1 },
    ]);
    await givenScope([{ serviceId: service.id, quantity: 1 }]);

    const quotation = await useCase.execute(serviceOrderId);

    expect(quotation.totalInCents).toBe(9990 + 4500 * 4 + 3000);
    expect(quotation.items.map((i) => i.kind).sort()).toEqual([
      'labor',
      'part',
      'part',
    ]);
  });

  it('multiplies a service bill of materials by how many times it is performed', async () => {
    const service = await givenService('Troca de pneu', 5000, [
      { supplyId: oilId, quantity: 1 },
    ]);
    await givenScope([{ serviceId: service.id, quantity: 4 }]);

    const quotation = await useCase.execute(serviceOrderId);

    const part = quotation.items.find((item) => item.kind === 'part')!;
    expect(part.quantity).toBe(4);
    expect(quotation.totalInCents).toBe(5000 * 4 + 4500 * 4);
  });

  it('merges a part shared by two services into a single line', async () => {
    const first = await givenService('Troca de oleo', 9990, [
      { supplyId: oilId, quantity: 4 },
    ]);
    const second = await givenService('Revisao', 20000, [
      { supplyId: oilId, quantity: 2 },
    ]);
    await givenScope([
      { serviceId: first.id, quantity: 1 },
      { serviceId: second.id, quantity: 1 },
    ]);

    const quotation = await useCase.execute(serviceOrderId);

    const partLines = quotation.items.filter((item) => item.kind === 'part');
    expect(partLines).toHaveLength(1);
    expect(partLines[0].quantity).toBe(6);
  });

  // The reason the quotation copies names and prices instead of joining.
  it('keeps its total when the catalogue changes afterwards', async () => {
    const service = await givenService('Troca de oleo', 9990, [
      { supplyId: oilId, quantity: 1 },
    ]);
    await givenScope([{ serviceId: service.id, quantity: 1 }]);

    const quotation = await useCase.execute(serviceOrderId);
    const totalAtIssue = quotation.totalInCents;

    service.update({ laborPriceInCents: 50000 });
    await services.save(service);
    parts.add({ id: oilId, name: 'Oleo 5W30', priceInCents: 99999 });

    const reloaded = await quotations.findById(quotation.id);
    expect(reloaded!.totalInCents).toBe(totalAtIssue);
    expect(reloaded!.totalInCents).toBe(9990 + 4500);
  });

  it('refuses to issue when a part left the catalogue', async () => {
    const missingSupplyId = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
    const service = await givenService('Troca de oleo', 9990, [
      { supplyId: missingSupplyId, quantity: 1 },
    ]);
    await givenScope([{ serviceId: service.id, quantity: 1 }]);

    await expect(useCase.execute(serviceOrderId)).rejects.toThrow(
      PartUnavailableForQuotationError,
    );
    expect(quotations.quotations.size).toBe(0);
  });

  it('refuses to issue when a service left the catalogue', async () => {
    await givenScope([
      { serviceId: 'dddddddd-dddd-dddd-dddd-dddddddddddd', quantity: 1 },
    ]);

    await expect(useCase.execute(serviceOrderId)).rejects.toThrow(
      ServiceUnavailableForQuotationError,
    );
  });

  it('refuses to issue for an order with no scope of work', async () => {
    await expect(useCase.execute(serviceOrderId)).rejects.toThrow(
      InvalidQuotationError,
    );
  });
});
