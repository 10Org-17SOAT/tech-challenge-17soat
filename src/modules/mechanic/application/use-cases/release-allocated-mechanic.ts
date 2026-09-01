import { Mechanic } from '../../domain/mechanic.entity';
import type { MechanicRepository } from '../../domain/repository/mechanic.repository';
import {
  MechanicNotAllocatedException,
  WrongServiceOrderException,
} from '../../domain/exceptions/mechanic.exceptions';
import { MECHANIC_AVAILABILITY } from '../../domain/value-objects/mechanic-availability.enum';
import { MechanicNotFoundException } from '../exceptions/mechanic-application.exception';

/**
 * Shared by ReleaseMechanicUseCase and CompleteExecutionUseCase: both end an
 * allocation and differ only in the events they publish afterwards. The guard
 * order matters — "not found" before "not allocated" before "wrong order" — so
 * both use cases answer an invalid request with the same status.
 */
export async function releaseAllocatedMechanic(
  repository: MechanicRepository,
  mechanicId: string,
  serviceOrderId: string,
): Promise<Mechanic> {
  const mechanic = await repository.findById(mechanicId);

  if (mechanic === null) {
    throw new MechanicNotFoundException(mechanicId);
  }

  if (mechanic.getAvailability() !== MECHANIC_AVAILABILITY.Allocated) {
    throw new MechanicNotAllocatedException(mechanicId);
  }

  if (mechanic.getCurrentServiceOrderId() !== serviceOrderId) {
    throw new WrongServiceOrderException(mechanicId, serviceOrderId);
  }

  const released = await repository.releaseIfAllocated(
    mechanicId,
    serviceOrderId,
  );

  if (released === null) {
    throw new MechanicNotAllocatedException(mechanicId);
  }

  return released;
}
