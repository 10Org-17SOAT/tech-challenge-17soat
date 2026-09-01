import type {
  ServiceOrderBilling,
  ServiceOrderBillingQuery,
} from '../../service-management/quotations/public/service-order-billing.query';

export class InMemoryServiceOrderBillingQuery implements ServiceOrderBillingQuery {
  readonly billings = new Map<string, ServiceOrderBilling>();

  findByServiceOrderId(
    serviceOrderId: string,
  ): Promise<ServiceOrderBilling | null> {
    return Promise.resolve(this.billings.get(serviceOrderId) ?? null);
  }
}
