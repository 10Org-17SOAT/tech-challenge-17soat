import { randomUUID } from 'node:crypto';
import { PaymentNotFoundError } from '../domain/errors/payment-not-found.error';
import { Payment } from '../domain/payment.entity';
import { InMemoryPaymentRepository } from '../__test__/in-memory-payment.repository';
import { GetPaymentUseCase } from './get-payment.usecase';

describe('GetPaymentUseCase', () => {
  let repository: InMemoryPaymentRepository;
  let useCase: GetPaymentUseCase;

  beforeEach(() => {
    repository = new InMemoryPaymentRepository();
    useCase = new GetPaymentUseCase(repository);
  });

  it('returns the payment by id', async () => {
    const payment = Payment.settle({
      serviceOrderReference: randomUUID(),
      amountInCents: 1000,
    });
    await repository.insert(payment);

    await expect(useCase.execute(payment.id)).resolves.toBe(payment);
  });

  it('throws when the payment does not exist', async () => {
    await expect(useCase.execute(randomUUID())).rejects.toBeInstanceOf(
      PaymentNotFoundError,
    );
  });
});
