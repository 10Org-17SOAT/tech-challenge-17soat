import { Inject, Injectable } from '@nestjs/common';
import { ConsultantNotFoundError } from '../domain/errors/consultant-not-found.error';
import { CONSULTANT_REPOSITORY } from '../domain/consultant.repository';
import type { ConsultantRepository } from '../domain/consultant.repository';

@Injectable()
export class DeleteConsultantUseCase {
  constructor(
    @Inject(CONSULTANT_REPOSITORY)
    private readonly consultantRepository: ConsultantRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const consultant = await this.consultantRepository.findById(id);
    if (!consultant) {
      throw new ConsultantNotFoundError(id);
    }

    // No allocation/availability rule for consultants (unlike mechanics):
    // deletion is unconditional soft delete.
    consultant.delete();
    await this.consultantRepository.save(consultant);
  }
}
