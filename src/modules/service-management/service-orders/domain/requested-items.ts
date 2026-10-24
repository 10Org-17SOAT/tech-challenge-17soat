import { InvalidServiceOrderError } from './errors/invalid-service-order.error';
import { ServiceItem } from './service-item';

export interface RequestedPartProps {
  supplyId: string;
  quantity: number;
}

/** A stock part the customer asked for at the desk, e.g. "use this brand of oil". */
export class RequestedPart {
  private constructor(private readonly props: RequestedPartProps) {}

  static create(props: RequestedPartProps): RequestedPart {
    if (!Number.isInteger(props.quantity) || props.quantity <= 0) {
      throw new InvalidServiceOrderError(
        'Requested part quantity must be a positive integer',
      );
    }
    return new RequestedPart({ ...props });
  }

  get supplyId(): string {
    return this.props.supplyId;
  }

  get quantity(): number {
    return this.props.quantity;
  }
}

/**
 * What the customer asked for when the order was opened. A request, not the
 * scope of work: the diagnosis confirms or adjusts it into `service_items`,
 * and only the quotation built from that scope reserves stock. Nothing here is
 * priced or reserved, and it is never rewritten after opening — it stays as
 * the record of what was asked.
 */
export interface RequestedItems {
  services: ServiceItem[];
  parts: RequestedPart[];
}
