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
import { MechanicReleased } from '../../domain/events/mechanic-released.event';
import { releaseAllocatedMechanic } from './release-allocated-mechanic';

@Injectable()
export class ReleaseMechanicUseCase {
  constructor(
    @Inject(MECHANIC_REPOSITORY)
    private readonly repository: MechanicRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly publisher: DomainEventPublisher,
  ) {}

  async execute(input: {
    mechanicId: string;
    serviceOrderId: string;
  }): Promise<Mechanic> {
    const released = await releaseAllocatedMechanic(
      this.repository,
      input.mechanicId,
      input.serviceOrderId,
    );

    this.publisher.publish(
      new MechanicReleased(input.mechanicId, input.serviceOrderId),
    );

    return released;
  }
}
