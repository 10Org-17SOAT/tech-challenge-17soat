import { Inject, Injectable } from '@nestjs/common';
import { ConsultantCpfAlreadyExistsError } from '../domain/errors/consultant-cpf-already-exists.error';
import { Consultant } from '../domain/consultant.entity';
import { CONSULTANT_REPOSITORY } from '../domain/consultant.repository';
import type { ConsultantRepository } from '../domain/consultant.repository';

export interface CreateConsultantInput {
  userId: string;
  name: string;
  cpf: string;
  phone: string;
}

@Injectable()
export class CreateConsultantUseCase {
  constructor(
    @Inject(CONSULTANT_REPOSITORY)
    private readonly consultantRepository: ConsultantRepository,
  ) {}

  async execute(input: CreateConsultantInput): Promise<Consultant> {
    const consultant = Consultant.create(input);

    const existing = await this.consultantRepository.findByCpf(consultant.cpf);
    if (existing) {
      throw new ConsultantCpfAlreadyExistsError(consultant.cpf);
    }

    await this.consultantRepository.save(consultant);
    return consultant;
  }
}
