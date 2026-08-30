import { InvalidServiceOrderError } from './errors/invalid-service-order.error';

export interface ServiceItemProps {
  serviceId: string;
  quantity: number;
}

/**
 * One catalogue service in an order's scope of work. Parts are never listed
 * here: they are derived from the service's bill of materials when the
 * quotation is issued.
 */
export class ServiceItem {
  private constructor(private readonly props: ServiceItemProps) {}

  static create(props: ServiceItemProps): ServiceItem {
    if (!Number.isInteger(props.quantity) || props.quantity <= 0) {
      throw new InvalidServiceOrderError(
        'Service item quantity must be a positive integer',
      );
    }
    return new ServiceItem({ ...props });
  }

  get serviceId(): string {
    return this.props.serviceId;
  }

  get quantity(): number {
    return this.props.quantity;
  }
}
