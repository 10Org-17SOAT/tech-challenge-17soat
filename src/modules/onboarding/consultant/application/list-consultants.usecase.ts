import { Inject, Injectable } from '@nestjs/common';
import { CONSULTANT_REPOSITORY } from '../domain/consultant.repository';
import type {
  ListConsultantsFilter,
  ConsultantRepository,
} from '../domain/consultant.repository';
import { Consultant } from '../domain/consultant.entity';

export interface ListConsultantsOutput {
  items: Consultant[];
  total: number;
  page: number;
  limit: number;
}

@Injectable()
export class ListConsultantsUseCase {
  constructor(
    @Inject(CONSULTANT_REPOSITORY)
    private readonly consultantRepository: ConsultantRepository,
  ) {}

  async execute(filter: ListConsultantsFilter): Promise<ListConsultantsOutput> {
    const { items, total } = await this.consultantRepository.findMany(filter);

    return { items, total, page: filter.page, limit: filter.limit };
  }
}
