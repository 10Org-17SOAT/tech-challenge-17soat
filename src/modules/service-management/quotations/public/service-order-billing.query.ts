/**
 * What service-management publishes to whoever needs to charge for an order —
 * today only the payment context. It lives in `quotations` and not in
 * `service-orders` because answering takes both halves: the order owns the
 * lifecycle, the quotation owns the price, and quotations is the module that
 * already imports service-orders (the reverse would be a cycle).
 *
 * `payable` is deliberately a fact, not a status: the whole `ServiceOrderStatus`
 * vocabulary stays inside this context. Payment does not need to know that
 * `in_diagnosis` exists in order to refuse a charge.
 */
export interface ServiceOrderBilling {
  serviceOrderId: string;
  payable: boolean;
  totalInCents: number;
}

export interface ServiceOrderBillingQuery {
  /**
   * `null` means the order does not exist (or was deleted, or was never
   * quoted) — a different answer from an order that exists but cannot be
   * charged yet, which comes back with `payable: false`. Callers turn the
   * first into a 404 and the second into a 409.
   */
  findByServiceOrderId(
    serviceOrderId: string,
  ): Promise<ServiceOrderBilling | null>;
}

export const SERVICE_ORDER_BILLING_QUERY = Symbol(
  'SERVICE_ORDER_BILLING_QUERY',
);
