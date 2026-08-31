import { Inject, Injectable } from '@nestjs/common';
import { CONSULTANT_REPOSITORY } from '../domain/consultant.repository';
import type { ConsultantRepository } from '../domain/consultant.repository';
import type {
  ConsultantDirectoryQuery,
  ConsultantView,
} from './consultant-directory.query';

@Injectable()
export class ConsultantDirectoryQueryImpl implements ConsultantDirectoryQuery {
  constructor(
    @Inject(CONSULTANT_REPOSITORY)
    private readonly consultantRepository: ConsultantRepository,
  ) {}

  async findById(id: string): Promise<ConsultantView | null> {
    const consultant = await this.consultantRepository.findById(id);
    return consultant ? { id: consultant.id, name: consultant.name } : null;
  }
}
