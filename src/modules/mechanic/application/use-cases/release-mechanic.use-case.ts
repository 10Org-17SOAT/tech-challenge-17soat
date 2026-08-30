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
import {
  MechanicNotAllocatedException,
  WrongServiceOrderException,
} from '../../domain/exceptions/mechanic.exceptions';
import { MECHANIC_AVAILABILITY } from '../../domain/value-objects/mechanic-availability.enum';
import { MechanicNotFoundException } from '../exceptions/mechanic-application.exception';

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
    const mechanic = await this.repository.findById(input.mechanicId);

    if (mechanic === null) {
      throw new MechanicNotFoundException(input.mechanicId);
    }

    if (mechanic.getAvailability() !== MECHANIC_AVAILABILITY.Allocated) {
      throw new MechanicNotAllocatedException(input.mechanicId);
    }

    if (mechanic.getCurrentServiceOrderId() !== input.serviceOrderId) {
      throw new WrongServiceOrderException(
        input.mechanicId,
        input.serviceOrderId,
      );
    }

    const released = await this.repository.releaseIfAllocated(
      input.mechanicId,
      input.serviceOrderId,
    );

    if (released === null) {
      throw new MechanicNotAllocatedException(input.mechanicId);
    }

    this.publisher.publish(
      new MechanicReleased(input.mechanicId, input.serviceOrderId),
    );

    return released;
  }
}
