import { Inject, Injectable } from '@nestjs/common';
import { SupplyNameAlreadyExistsError } from '../domain/errors/supply-name-already-exists.error';
import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';
import { Supply } from '../domain/supply.entity';
import { SUPPLY_REPOSITORY } from '../domain/supply.repository';
import type { SupplyRepository } from '../domain/supply.repository';

export interface UpdateSupplyInput {
  name?: string;
  description?: string | null;
  priceInCents?: number;
}

@Injectable()
export class UpdateSupplyUseCase {
  constructor(
    @Inject(SUPPLY_REPOSITORY)
    private readonly supplyRepository: SupplyRepository,
  ) {}

  async execute(id: string, input: UpdateSupplyInput): Promise<Supply> {
    const supply = await this.supplyRepository.findById(id);
    if (!supply) {
      throw new SupplyNotFoundError(id);
    }

    supply.update(input);

    if (input.name !== undefined) {
      const existing = await this.supplyRepository.findByName(supply.name);
      if (existing && existing.id !== supply.id) {
        throw new SupplyNameAlreadyExistsError(supply.name);
      }
    }

    await this.supplyRepository.save(supply);
    return supply;
  }
}
