import { OrderStatus } from '../order.entity';

export class OrderNotDeletableError extends Error {
  constructor(status: OrderStatus) {
    super(`Order in status "${status}" cannot be deleted`);
    this.name = 'OrderNotDeletableError';
  }
}
