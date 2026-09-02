import { Inject, Injectable } from '@nestjs/common';
import { SERVICE_ORDER_REPOSITORY } from '../../service-orders/domain/service-order.repository';
import type { ServiceOrderRepository } from '../../service-orders/domain/service-order.repository';
import { SERVICE_REPOSITORY } from '../../services/domain/service.repository';
import type { ServiceRepository } from '../../services/domain/service.repository';
import { PartUnavailableForQuotationError } from '../domain/errors/part-unavailable-for-quotation.error';
import { ServiceUnavailableForQuotationError } from '../domain/errors/service-unavailable-for-quotation.error';
import { PART_CATALOG } from '../domain/part-catalog.port';
import type { PartCatalog } from '../domain/part-catalog.port';
import {
  CreateQuotationItemProps,
  Quotation,
} from '../domain/quotation.entity';
import { QUOTATION_REPOSITORY } from '../domain/quotation.repository';
import type { QuotationRepository } from '../domain/quotation.repository';

/**
 * Turns an order's scope of work into a priced document.
 *
 * Every name and price is copied onto the quotation here and never read
 * through a join again: `services.labor_price_in_cents` and a supply's price
 * are mutable catalogue values, and what the customer approves must not shift
 * underneath them afterwards.
 */
@Injectable()
export class IssueQuotationUseCase {
  constructor(
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: QuotationRepository,
    @Inject(SERVICE_ORDER_REPOSITORY)
    private readonly orderRepository: ServiceOrderRepository,
    @Inject(SERVICE_REPOSITORY)
    private readonly serviceRepository: ServiceRepository,
    @Inject(PART_CATALOG)
    private readonly partCatalog: PartCatalog,
  ) {}

  async execute(serviceOrderId: string): Promise<Quotation> {
    const orderItems = await this.orderRepository.findItems(serviceOrderId);
    const serviceIds = orderItems.map((item) => item.serviceId);

    const services = await this.serviceRepository.findManyByIds(serviceIds);
    const servicesById = new Map(
      services.map((service) => [service.id, service]),
    );
    const missingServices = serviceIds.filter((id) => !servicesById.has(id));
    if (missingServices.length > 0) {
      throw new ServiceUnavailableForQuotationError(missingServices);
    }

    const billsOfMaterials =
      await this.serviceRepository.findSuppliesFor(serviceIds);

    // How many units of each part the whole order consumes: a service's bill
    // of materials multiplied by how many times that service is performed,
    // summed across services that share a part.
    const partQuantities = new Map<string, number>();
    for (const orderItem of orderItems) {
      for (const line of billsOfMaterials.get(orderItem.serviceId) ?? []) {
        partQuantities.set(
          line.supplyId,
          (partQuantities.get(line.supplyId) ?? 0) +
            line.quantity * orderItem.quantity,
        );
      }
    }

    const parts = await this.partCatalog.findManyByIds([
      ...partQuantities.keys(),
    ]);
    const missingParts = [...partQuantities.keys()].filter(
      (supplyId) => !parts.has(supplyId),
    );
    // A quotation missing a line is worse than no quotation: it would under-
    // charge the customer and nobody would notice. Refuse loudly instead.
    if (missingParts.length > 0) {
      throw new PartUnavailableForQuotationError(missingParts);
    }

    const items: CreateQuotationItemProps[] = [
      ...orderItems.map((orderItem) => {
        const service = servicesById.get(orderItem.serviceId)!;
        return {
          kind: 'labor' as const,
          referenceId: service.id,
          nameSnapshot: service.name,
          unitPriceInCents: service.laborPriceInCents,
          quantity: orderItem.quantity,
        };
      }),
      ...[...partQuantities.entries()].map(([supplyId, quantity]) => {
        const part = parts.get(supplyId)!;
        return {
          kind: 'part' as const,
          referenceId: part.id,
          nameSnapshot: part.name,
          unitPriceInCents: part.priceInCents,
          quantity,
        };
      }),
    ];

    const quotation = Quotation.issue({ serviceOrderId, items });
    await this.quotationRepository.save(quotation);
    return quotation;
  }
}
