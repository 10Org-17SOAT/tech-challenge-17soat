import { randomUUID } from 'node:crypto';
import { InvalidPaymentError } from './errors/invalid-payment.error';

export interface PaymentProps {
  id: string;
  // Not `serviceOrderId`: the order lives in another bounded context, so this
  // is an opaque reference, unenforced by any foreign key — the same stance
  // stock takes with `serviceOrderReference` on its ledger.
  serviceOrderReference: string;
  amountInCents: number;
  paidAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SettlePaymentProps {
  serviceOrderReference: string;
  amountInCents: number;
}

/**
 * A payment taken for a service order. Settlement is mocked: there is no
 * gateway to wait on, so a payment has exactly one outcome and comes into
 * existence already settled.
 *
 * That is why there is no `status`: with a single terminal state the column
 * would carry no information the row's existence does not. `paidAt` is the
 * fact; a row in `payments` means the order was paid.
 */
export class Payment {
  private constructor(private readonly props: PaymentProps) {}

  static settle(props: SettlePaymentProps): Payment {
    const now = new Date();
    return new Payment({
      id: randomUUID(),
      serviceOrderReference: Payment.validateReference(
        props.serviceOrderReference,
      ),
      amountInCents: Payment.validateAmount(props.amountInCents),
      paidAt: now,
      createdAt: now,
      updatedAt: now,
    });
  }

  static restore(props: PaymentProps): Payment {
    return new Payment({ ...props });
  }

  private static validateReference(reference: string): string {
    const trimmed = (reference ?? '').trim();
    if (trimmed.length === 0) {
      throw new InvalidPaymentError('Payment must reference a service order');
    }
    return trimmed;
  }

  // Zero is refused, not just negatives: a service order with nothing to
  // charge should never have reached a payment at all, and recording a
  // R$ 0,00 payment would silently mark it delivered.
  private static validateAmount(amountInCents: number): number {
    if (!Number.isInteger(amountInCents) || amountInCents <= 0) {
      throw new InvalidPaymentError(
        'Payment amount must be a positive integer amount of cents',
      );
    }
    return amountInCents;
  }

  get id(): string {
    return this.props.id;
  }

  get serviceOrderReference(): string {
    return this.props.serviceOrderReference;
  }

  get amountInCents(): number {
    return this.props.amountInCents;
  }

  get paidAt(): Date {
    return this.props.paidAt;
  }

  get createdAt(): Date {
    return this.props.createdAt;
  }

  get updatedAt(): Date {
    return this.props.updatedAt;
  }
}
