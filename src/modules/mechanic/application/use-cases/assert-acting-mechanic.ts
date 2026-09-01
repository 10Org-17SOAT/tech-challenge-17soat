import type { MechanicRepository } from '../../domain/repository/mechanic.repository';
import { MechanicIdentityMismatchException } from '../../domain/exceptions/mechanic.exceptions';

/**
 * A mechanic may only act on their own allocation. Callers that are allowed to
 * act for anyone — an admin — pass no `actingUserId` and skip this entirely.
 *
 * An account with no mechanic linked to it is rejected rather than waved
 * through: without a profile there is no identity to match, and treating that
 * as "no check needed" would make an unlinked account the way around the rule.
 */
export async function assertActingMechanic(
  repository: MechanicRepository,
  mechanicId: string,
  actingUserId: string | undefined,
): Promise<void> {
  if (actingUserId === undefined) {
    return;
  }

  const acting = await repository.findByUserId(actingUserId);

  if (acting === null || acting.getId() !== mechanicId) {
    throw new MechanicIdentityMismatchException(mechanicId);
  }
}
