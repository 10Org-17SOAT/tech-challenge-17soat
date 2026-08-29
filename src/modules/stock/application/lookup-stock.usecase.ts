import { Inject, Injectable } from '@nestjs/common';
import { SupplyNotFoundError } from '@/modules/stock/domain/errors/supply-not-found.error';
import { DOMAIN_EVENT_PUBLISHER } from '@/modules/stock/domain/events/domain-event-publisher';
import type { DomainEventPublisher } from '@/modules/stock/domain/events/domain-event-publisher';
import { PurchaseRequestNeeded } from '@/modules/stock/domain/events/purchase-request-needed.event';
import { STOCK_MOVEMENT_REPOSITORY } from '@/modules/stock/domain/stock-movement.repository';
import type { StockMovementRepository } from '@/modules/stock/domain/stock-movement.repository';
import { SUPPLY_REPOSITORY } from '@/modules/stock/domain/supply.repository';
import type { SupplyRepository } from '@/modules/stock/domain/supply.repository';

export interface LookupStockOutput {
  supplyId: string;
  availableBalance: number;
}

@Injectable()
export class LookupStockUseCase {
  constructor(
    @Inject(SUPPLY_REPOSITORY)
    private readonly supplyRepository: SupplyRepository,
    @Inject(STOCK_MOVEMENT_REPOSITORY)
    private readonly stockMovementRepository: StockMovementRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  async execute(supplyId: string): Promise<LookupStockOutput> {
    // Two distinct branches of the event storming: a supply absent from the
    // catalogue is a 404, while a known supply with nothing left is a 200 that
    // asks for a purchase.
    const supply = await this.supplyRepository.findById(supplyId);
    if (!supply) {
      throw new SupplyNotFoundError(supplyId);
    }

    const availableBalance =
      await this.stockMovementRepository.getAvailableBalance(supply.id);

    if (availableBalance === 0) {
      this.eventPublisher.publish(new PurchaseRequestNeeded(supply.id));
    }

    return { supplyId: supply.id, availableBalance };
  }
}
