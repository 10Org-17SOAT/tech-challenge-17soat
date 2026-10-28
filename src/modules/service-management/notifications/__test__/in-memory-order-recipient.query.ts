import type {
  OrderRecipient,
  OrderRecipientQuery,
} from '../domain/order-recipient.port';

export class InMemoryOrderRecipientQuery implements OrderRecipientQuery {
  private readonly byServiceOrder = new Map<string, OrderRecipient>();

  set(serviceOrderId: string, recipient: OrderRecipient): void {
    this.byServiceOrder.set(serviceOrderId, recipient);
  }

  findForServiceOrder(serviceOrderId: string): Promise<OrderRecipient | null> {
    return Promise.resolve(this.byServiceOrder.get(serviceOrderId) ?? null);
  }
}

export function makeRecipient(
  overrides: Partial<OrderRecipient> = {},
): OrderRecipient {
  return {
    customerId: '3f6a1b20-1c2d-4e3f-8a9b-0c1d2e3f4a5b',
    name: 'Ana Souza',
    email: 'ana@example.com',
    vehicle: {
      manufacturer: 'Fiat',
      model: 'Uno',
      year: 2018,
      licensePlate: 'ABC-1234',
    },
    ...overrides,
  };
}
