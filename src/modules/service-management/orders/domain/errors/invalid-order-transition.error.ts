import { OrderStatus } from '../order.entity';

export class InvalidOrderTransitionError extends Error {
  constructor(from: OrderStatus, to: OrderStatus) {
    super(`Cannot transition order status from "${from}" to "${to}"`);
    this.name = 'InvalidOrderTransitionError';
  }
}
