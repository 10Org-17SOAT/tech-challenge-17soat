import type { DrizzleDatabase } from '../../../../shared/config/database/drizzle.provider';
import { ServiceOrderAlreadyPaidError } from '../../domain/errors/service-order-already-paid.error';
import { Payment } from '../../domain/payment.entity';
import { DrizzlePaymentRepository } from './drizzle-payment.repository';

/**
 * The unique constraint on `service_order_reference` is what actually stops an
 * order being paid twice — the use case deliberately does not read first. Over
 * HTTP the second attempt is turned away earlier, by the order no longer being
 * payable, so the losing side of that race only shows up here.
 */
describe('DrizzlePaymentRepository', () => {
  const payment = Payment.settle({
    serviceOrderReference: 'order-1',
    amountInCents: 20000,
  });

  const repositoryRejectingWith = (error: unknown) => {
    const db = {
      insert: () => ({
        values: async (): Promise<never> => {
          await Promise.resolve();
          throw error;
        },
      }),
    } as unknown as DrizzleDatabase;
    return new DrizzlePaymentRepository(db);
  };

  it('translates a unique violation into ServiceOrderAlreadyPaidError', async () => {
    const repository = repositoryRejectingWith({ code: '23505' });

    await expect(repository.insert(payment)).rejects.toThrow(
      ServiceOrderAlreadyPaidError,
    );
  });

  // Drizzle wraps the driver error, so the pg code is one or more `cause`
  // levels down rather than on the error it throws.
  it('finds the unique violation behind a wrapping cause', async () => {
    const repository = repositoryRejectingWith(
      new Error('insert failed', { cause: { code: '23505' } }),
    );

    await expect(repository.insert(payment)).rejects.toThrow(
      ServiceOrderAlreadyPaidError,
    );
  });

  it('rethrows any other database failure untouched', async () => {
    const failure = new Error('connection terminated');
    const repository = repositoryRejectingWith(failure);

    await expect(repository.insert(payment)).rejects.toBe(failure);
  });

  it('rethrows a non-object failure untouched', async () => {
    const repository = repositoryRejectingWith('boom');

    await expect(repository.insert(payment)).rejects.toBe('boom');
  });
});
