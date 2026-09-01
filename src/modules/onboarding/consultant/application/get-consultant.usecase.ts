import { Inject, Injectable } from '@nestjs/common';
import { ConsultantNotFoundError } from '../domain/errors/consultant-not-found.error';
import { Consultant } from '../domain/consultant.entity';
import { CONSULTANT_REPOSITORY } from '../domain/consultant.repository';
import type { ConsultantRepository } from '../domain/consultant.repository';

@Injectable()
export class GetConsultantUseCase {
  constructor(
    @Inject(CONSULTANT_REPOSITORY)
    private readonly consultantRepository: ConsultantRepository,
  ) {}

  async execute(id: string): Promise<Consultant> {
    const consultant = await this.consultantRepository.findById(id);
    if (!consultant) {
      throw new ConsultantNotFoundError(id);
    }
    return consultant;
  }
}
