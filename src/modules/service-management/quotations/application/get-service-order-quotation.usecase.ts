import { Inject, Injectable } from '@nestjs/common';
import { QuotationNotFoundError } from '../domain/errors/quotation-not-found.error';
import { Quotation } from '../domain/quotation.entity';
import { QUOTATION_REPOSITORY } from '../domain/quotation.repository';
import type { QuotationRepository } from '../domain/quotation.repository';

@Injectable()
export class GetServiceOrderQuotationUseCase {
  constructor(
    @Inject(QUOTATION_REPOSITORY)
    private readonly quotationRepository: QuotationRepository,
  ) {}

  async execute(serviceOrderId: string): Promise<Quotation> {
    const quotation =
      await this.quotationRepository.findByServiceOrderId(serviceOrderId);
    if (!quotation) {
      throw new QuotationNotFoundError(serviceOrderId);
    }
    return quotation;
  }
}
