import { ServiceOrderStatus } from '../service-order.entity';

export class InvalidServiceOrderTransitionError extends Error {
  constructor(from: ServiceOrderStatus, to: ServiceOrderStatus) {
    super(`Cannot transition order status from "${from}" to "${to}"`);
    this.name = 'InvalidServiceOrderTransitionError';
  }
}
