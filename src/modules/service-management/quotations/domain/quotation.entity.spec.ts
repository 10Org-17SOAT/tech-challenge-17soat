import { InvalidQuotationError } from './errors/invalid-quotation.error';
import { QuotationAlreadyApprovedError } from './errors/quotation-already-approved.error';
import { Quotation, QuotationItem } from './quotation.entity';

const serviceOrderId = '11111111-1111-1111-1111-111111111111';

const laborItem = {
  kind: 'labor' as const,
  referenceId: '22222222-2222-2222-2222-222222222222',
  nameSnapshot: 'Troca de oleo',
  unitPriceInCents: 9990,
  quantity: 1,
};

const partItem = {
  kind: 'part' as const,
  referenceId: '33333333-3333-3333-3333-333333333333',
  nameSnapshot: 'Oleo 5W30',
  unitPriceInCents: 4500,
  quantity: 4,
};

describe('Quotation', () => {
  it('issues in status issued, with no approval timestamp', () => {
    const quotation = Quotation.issue({
      serviceOrderId,
      items: [laborItem],
    });

    expect(quotation.status).toBe('issued');
    expect(quotation.approvedAt).toBeNull();
    expect(quotation.serviceOrderId).toBe(serviceOrderId);
    expect(quotation.items).toHaveLength(1);
  });

  it('refuses to issue with no items', () => {
    expect(() => Quotation.issue({ serviceOrderId, items: [] })).toThrow(
      InvalidQuotationError,
    );
  });

  it('totals labour and parts by unit price times quantity', () => {
    const quotation = Quotation.issue({
      serviceOrderId,
      items: [laborItem, partItem],
    });

    expect(quotation.totalInCents).toBe(9990 + 4500 * 4);
  });

  it('approves once, stamping the timestamp', () => {
    const quotation = Quotation.issue({ serviceOrderId, items: [laborItem] });

    quotation.approve();

    expect(quotation.status).toBe('approved');
    expect(quotation.approvedAt).toBeInstanceOf(Date);
  });

  it('refuses a second approval', () => {
    const quotation = Quotation.issue({ serviceOrderId, items: [laborItem] });
    quotation.approve();

    expect(() => quotation.approve()).toThrow(QuotationAlreadyApprovedError);
  });

  describe('items', () => {
    it('rejects an empty name, a negative price and a non-positive quantity', () => {
      expect(() =>
        QuotationItem.create({ ...laborItem, nameSnapshot: '   ' }),
      ).toThrow(InvalidQuotationError);
      expect(() =>
        QuotationItem.create({ ...laborItem, unitPriceInCents: -1 }),
      ).toThrow(InvalidQuotationError);
      expect(() => QuotationItem.create({ ...laborItem, quantity: 0 })).toThrow(
        InvalidQuotationError,
      );
    });

    it('accepts a zero unit price — a service can be free, a part cannot be negative', () => {
      const item = QuotationItem.create({
        ...laborItem,
        unitPriceInCents: 0,
      });

      expect(item.subtotalInCents).toBe(0);
    });
  });
});
