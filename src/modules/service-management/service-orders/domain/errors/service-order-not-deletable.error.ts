import { ServiceOrderStatus } from '../service-order.entity';

export class ServiceOrderNotDeletableError extends Error {
  constructor(status: ServiceOrderStatus) {
    super(`Order in status "${status}" cannot be deleted`);
    this.name = 'ServiceOrderNotDeletableError';
  }
}
