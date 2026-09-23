import { Inject, Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { DOMAIN_EVENT_PUBLISHER } from '../../../../shared/domain/events/domain-event-publisher';
import type { DomainEventPublisher } from '../../../../shared/domain/events/domain-event-publisher';
import type { QuotationApproved } from '../../../service-management/quotations/domain/events/quotation-approved.event';
import { InsufficientStockError } from '../../domain/errors/insufficient-stock.error';
import { SupplyNotFoundError } from '../../domain/errors/supply-not-found.error';
import { PurchaseRequestNeeded } from '../../domain/events/purchase-request-needed.event';
import { ReservePartUseCase } from '../reserve-part.usecase';

/**
 * Reserving the parts is now a consequence of the customer approving, not a
 * request the admin has to remember to make: approval is the moment the
 * workshop commits to those parts, so it is the moment the ledger must
 * commit them too.
 *
 * `QuotationApproved` is imported `type`-only from service-management — it
 * never reaches the compiled output, so stock keeps no runtime dependency on
 * that module, only on the event's shape and the `quotation.approved` string
 * matched below. The same one-way arrow `PaymentReceivedHandler` uses.
 */
@Injectable()
export class QuotationApprovedHandler {
  private readonly logger = new Logger(QuotationApprovedHandler.name);

  constructor(
    private readonly reservePart: ReservePartUseCase,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly eventPublisher: DomainEventPublisher,
  ) {}

  @OnEvent('quotation.approved')
  async handle(event: QuotationApproved): Promise<void> {
    if (event.parts.length === 0) return;

    // Sequentially, never Promise.all: each reservation takes a row lock on
    // its supply, and a quotation listing the same supply twice would have
    // two transactions waiting on each other. Sequential also keeps the log
    // readable when one line of many fails.
    for (const part of event.parts) {
      await this.reserveOne(event, part.supplyId, part.quantity);
    }
  }

  /**
   * One line, and a failure here never stops the others. A part that cannot
   * be reserved is a purchase to make, not a reason to leave the rest of an
   * approved order unreserved — and the order has already advanced to
   * `awaiting_execution` by the time this runs, so throwing would only strand
   * the remaining lines.
   */
  private async reserveOne(
    event: QuotationApproved,
    supplyId: string,
    quantity: number,
  ): Promise<void> {
    try {
      await this.reservePart.execute({
        supplyId,
        quantity,
        serviceOrderReference: event.serviceOrderId,
      });
    } catch (error) {
      if (error instanceof InsufficientStockError) {
        this.logger.warn(
          `Order ${event.serviceOrderId}: ${error.message} — requesting purchase`,
        );
        // The same signal a manual lookup raises, so whoever watches for
        // replenishment does not need to know which path asked.
        this.eventPublisher.publish(new PurchaseRequestNeeded(supplyId));
        return;
      }
      if (error instanceof SupplyNotFoundError) {
        // The supply was soft-deleted between issuing the quotation and
        // approving it. The frozen line is still correct about what was
        // priced; there is simply nothing left to reserve against.
        this.logger.warn(`Order ${event.serviceOrderId}: ${error.message}`);
        return;
      }
      throw error;
    }
  }
}
