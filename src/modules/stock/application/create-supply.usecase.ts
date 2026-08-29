import { Inject, Injectable } from '@nestjs/common';
import { SupplyNameAlreadyExistsError } from '@/modules/stock/domain/errors/supply-name-already-exists.error';
import { Supply } from '@/modules/stock/domain/supply.entity';
import { SUPPLY_REPOSITORY } from '@/modules/stock/domain/supply.repository';
import type { SupplyRepository } from '@/modules/stock/domain/supply.repository';

export interface CreateSupplyInput {
  name: string;
  description?: string | null;
  priceInCents: number;
}

@Injectable()
export class CreateSupplyUseCase {
  constructor(
    @Inject(SUPPLY_REPOSITORY)
    private readonly supplyRepository: SupplyRepository,
  ) {}

  async execute(input: CreateSupplyInput): Promise<Supply> {
    const supply = Supply.create(input);

    const existing = await this.supplyRepository.findByName(supply.name);
    if (existing) {
      throw new SupplyNameAlreadyExistsError(supply.name);
    }

    await this.supplyRepository.save(supply);
    return supply;
  }
}
