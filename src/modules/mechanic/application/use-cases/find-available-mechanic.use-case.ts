import { Inject, Injectable } from '@nestjs/common';
import { Mechanic } from '../../domain/mechanic.entity';
import {
  MECHANIC_REPOSITORY,
  type ClaimFilter,
  type MechanicRepository,
} from '../../domain/repository/mechanic.repository';
import {
  DOMAIN_EVENT_PUBLISHER,
  type DomainEventPublisher,
} from '../../domain/events/domain-event-publisher';
import { MechanicAllocated } from '../../domain/events/mechanic-allocated.event';
import { InvalidMechanicException } from '../../domain/exceptions/mechanic.exceptions';
import { SPECIALTIES } from '../../domain/value-objects/specialty.enum';
import { NoAvailableMechanicException } from '../exceptions/mechanic-application.exception';

@Injectable()
export class FindAvailableMechanicUseCase {
  constructor(
    @Inject(MECHANIC_REPOSITORY)
    private readonly repository: MechanicRepository,
    @Inject(DOMAIN_EVENT_PUBLISHER)
    private readonly publisher: DomainEventPublisher,
  ) {}

  async execute(filter: ClaimFilter): Promise<Mechanic> {
    this.validate(filter);

    const mechanic = await this.repository.claimIfAvailable(filter);

    if (mechanic === null) {
      throw new NoAvailableMechanicException();
    }

    this.publisher.publish(
      new MechanicAllocated(mechanic.getId(), filter.serviceOrderId),
    );

    return mechanic;
  }

  private validate(filter: ClaimFilter): void {
    if (filter.serviceOrderId.trim().length === 0) {
      throw new InvalidMechanicException(
        'A claim requires a service order id.',
      );
    }

    if (
      filter.specialty !== undefined &&
      !SPECIALTIES.includes(filter.specialty)
    ) {
      throw new InvalidMechanicException(
        `Invalid specialty: "${filter.specialty}".`,
      );
    }
  }
}