import { ApprovalTokenExpiredError } from '../domain/errors/approval-token-expired.error';
import { InvalidApprovalTokenError } from '../domain/errors/invalid-approval-token.error';
import { Quotation } from '../domain/quotation.entity';
import { InMemoryQuotationRepository } from '../__test__/in-memory-quotation.repository';
import { GetQuotationByTokenUseCase } from './get-quotation-by-token.usecase';

describe('GetQuotationByTokenUseCase', () => {
  let quotations: InMemoryQuotationRepository;
  let useCase: GetQuotationByTokenUseCase;
  let quotation: Quotation;
  let rawToken: string;

  beforeEach(async () => {
    quotations = new InMemoryQuotationRepository();
    useCase = new GetQuotationByTokenUseCase(quotations);

    quotation = Quotation.issue({
      serviceOrderId: '11111111-1111-1111-1111-111111111111',
      items: [
        {
          kind: 'labor',
          referenceId: '22222222-2222-2222-2222-222222222222',
          nameSnapshot: 'Troca de oleo',
          unitPriceInCents: 9990,
          quantity: 1,
        },
      ],
    });
    rawToken = quotation.issueApprovalToken();
    await quotations.save(quotation);
  });

  it('returns the quotation the token was emailed for, unchanged', async () => {
    const found = await useCase.execute(rawToken);

    expect(found.id).toBe(quotation.id);
    expect(found.status).toBe('issued');
  });

  // The raw token never reaches a query; the lookup is by digest.
  it('finds the quotation by the hash of the token, not the token', async () => {
    await expect(
      quotations.findByApprovalTokenHash(rawToken),
    ).resolves.toBeNull();
    await expect(
      quotations.findByApprovalTokenHash(Quotation.hashApprovalToken(rawToken)),
    ).resolves.toBe(quotation);
  });

  it('refuses an unknown token without saying whether one exists', async () => {
    await expect(useCase.execute('nao-existe')).rejects.toThrow(
      InvalidApprovalTokenError,
    );
  });

  it('refuses an expired link', async () => {
    const expiredToken = quotation.issueApprovalToken(-1);
    await quotations.save(quotation);

    await expect(useCase.execute(expiredToken)).rejects.toThrow(
      ApprovalTokenExpiredError,
    );
  });
});
