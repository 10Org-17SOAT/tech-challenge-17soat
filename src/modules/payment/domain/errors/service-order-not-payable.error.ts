/**
 * The order exists but is not ready to be charged — it has not been finished
 * yet, or it was already delivered. The status itself is not reported: which
 * states exist is service-management's vocabulary, and the billing contract
 * deliberately keeps it on that side of the boundary.
 */
export class ServiceOrderNotPayableError extends Error {
  constructor(readonly serviceOrderId: string) {
    super(
      `Service order ${serviceOrderId} is not ready to be paid: only a finished order awaiting payment can be charged`,
    );
    this.name = 'ServiceOrderNotPayableError';
  }
}
