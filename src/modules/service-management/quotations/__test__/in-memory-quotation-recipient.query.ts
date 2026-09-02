import type {
  QuotationRecipient,
  QuotationRecipientQuery,
} from '../domain/quotation-recipient.port';

export class InMemoryQuotationRecipientQuery implements QuotationRecipientQuery {
  private readonly byServiceOrder = new Map<string, QuotationRecipient>();

  set(serviceOrderId: string, recipient: QuotationRecipient): void {
    this.byServiceOrder.set(serviceOrderId, recipient);
  }

  findForServiceOrder(
    serviceOrderId: string,
  ): Promise<QuotationRecipient | null> {
    return Promise.resolve(this.byServiceOrder.get(serviceOrderId) ?? null);
  }
}

export function aRecipient(
  overrides: Partial<QuotationRecipient> = {},
): QuotationRecipient {
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
