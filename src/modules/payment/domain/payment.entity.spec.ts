import { InvalidPaymentError } from './errors/invalid-payment.error';
import { Payment } from './payment.entity';

describe('Payment', () => {
  it('settles with the given reference and amount, already paid', () => {
    const payment = Payment.settle({
      serviceOrderReference: 'OS-1',
      amountInCents: 45000,
    });

    expect(payment.serviceOrderReference).toBe('OS-1');
    expect(payment.amountInCents).toBe(45000);
    expect(payment.paidAt).toBeInstanceOf(Date);
  });

  it('rejects a blank service order reference', () => {
    expect(() =>
      Payment.settle({ serviceOrderReference: '  ', amountInCents: 1000 }),
    ).toThrow(InvalidPaymentError);
  });

  it('rejects a zero amount', () => {
    expect(() =>
      Payment.settle({ serviceOrderReference: 'OS-1', amountInCents: 0 }),
    ).toThrow(InvalidPaymentError);
  });

  it('rejects a negative amount', () => {
    expect(() =>
      Payment.settle({ serviceOrderReference: 'OS-1', amountInCents: -100 }),
    ).toThrow(InvalidPaymentError);
  });

  it('rejects a non-integer amount', () => {
    expect(() =>
      Payment.settle({ serviceOrderReference: 'OS-1', amountInCents: 10.5 }),
    ).toThrow(InvalidPaymentError);
  });

  it('restores from persisted props without re-validating', () => {
    const now = new Date();
    const payment = Payment.restore({
      id: 'p-1',
      serviceOrderReference: 'OS-1',
      amountInCents: 45000,
      paidAt: now,
      createdAt: now,
      updatedAt: now,
    });

    expect(payment.id).toBe('p-1');
    expect(payment.amountInCents).toBe(45000);
    expect(payment.createdAt).toBe(now);
    expect(payment.updatedAt).toBe(now);
  });
});
