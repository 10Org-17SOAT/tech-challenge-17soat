import { Inject, Injectable } from '@nestjs/common';
import { Mechanic } from '../../domain/mechanic.entity';
import {
  MECHANIC_REPOSITORY,
  type MechanicRepository,
} from '../../domain/repository/mechanic.repository';
import {
  DOMAIN_EVENT_PUBLISHER,
  type DomainEventPublisher,
} from '../../../../shared/domain/events/domain-event-publisher';
import { ExecutionCompleted } from '../../domain/events/execution-completed.event';
import { MechanicReleased } from '../../domain/events/mechanic-released.event';
import { assertActingMechanic } from './assert-acting-mechanic';
import { releaseAllocatedMechanic } from './release-allocated-mechanic';

/**
 * The mechanic reporting the work as done. Ends the allocation exactly like a
 * release does, and additionally announces that the execution is over so
 * service-management can move the order to `finished`.
 */
@Injectable()
export class CompleteExecutionUseCase {
  constructor(
    @Inject(MECHANIC_REPOSITORY)
    private readonly repository: MechanicRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly publisher: DomainEventPublisher,
  ) {}

  async execute(input: {
    mechanicId: string;
    serviceOrderId: string;
    /** The caller, when they may only act as themselves. */
    actingUserId?: string;
  }): Promise<Mechanic> {
    // Checked here rather than inside releaseAllocatedMechanic: that helper
    // guards the allocation invariants, which hold no matter who is asking.
    await assertActingMechanic(
      this.repository,
      input.mechanicId,
      input.actingUserId,
    );

    const released = await releaseAllocatedMechanic(
      this.repository,
      input.mechanicId,
      input.serviceOrderId,
    );

    this.publisher.publish(
      new MechanicReleased(input.mechanicId, input.serviceOrderId),
    );
    this.publisher.publish(new ExecutionCompleted(input.serviceOrderId));

    return released;
  }
}
