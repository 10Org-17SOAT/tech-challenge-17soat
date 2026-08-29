import { Inject, Injectable } from '@nestjs/common';
import { SupplyNotFoundError } from '@/modules/stock/domain/errors/supply-not-found.error';
import { SUPPLY_REPOSITORY } from '@/modules/stock/domain/supply.repository';
import type { SupplyRepository } from '@/modules/stock/domain/supply.repository';

@Injectable()
export class DeleteSupplyUseCase {
  constructor(
    @Inject(SUPPLY_REPOSITORY)
    private readonly supplyRepository: SupplyRepository,
  ) {}

  async execute(id: string): Promise<void> {
    const supply = await this.supplyRepository.findById(id);
    if (!supply) {
      throw new SupplyNotFoundError(id);
    }

    supply.delete();
    await this.supplyRepository.save(supply);
  }
}
