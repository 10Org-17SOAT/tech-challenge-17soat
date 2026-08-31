import { Inject, Injectable } from '@nestjs/common';
import { ConsultantNotFoundError } from '../domain/errors/consultant-not-found.error';
import { Consultant } from '../domain/consultant.entity';
import { CONSULTANT_REPOSITORY } from '../domain/consultant.repository';
import type { ConsultantRepository } from '../domain/consultant.repository';

export interface UpdateConsultantInput {
  name?: string;
  phone?: string;
}

@Injectable()
export class UpdateConsultantUseCase {
  constructor(
    @Inject(CONSULTANT_REPOSITORY)
    private readonly consultantRepository: ConsultantRepository,
  ) {}

  async execute(id: string, input: UpdateConsultantInput): Promise<Consultant> {
    const consultant = await this.consultantRepository.findById(id);
    if (!consultant) {
      throw new ConsultantNotFoundError(id);
    }

    // CPF is immutable, same as customer document, mechanic CPF, and stock
    // keeper CPF: it is the identity of the person, never updated through
    // this endpoint.
    consultant.update(input);
    await this.consultantRepository.save(consultant);

    return consultant;
  }
}
