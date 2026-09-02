/**
 * The consultant module's published contract — the only thing other
 * modules may import from `consultant`. Everything under `domain/`,
 * `application/` and `infrastructure/` is private to this module.
 *
 * It answers one question: who is this consultant, right now. Callers get
 * a plain view, never the `Consultant` entity, so this module stays free
 * to reshape its own model. Absence (soft-deleted or unknown id) is a
 * `null`, not an error — the caller decides what that means for its own
 * domain (e.g. rejecting an operation).
 */
export interface ConsultantView {
  id: string;
  name: string;
}

export interface ConsultantDirectoryQuery {
  findById(id: string): Promise<ConsultantView | null>;
}

export const CONSULTANT_DIRECTORY_QUERY = Symbol('CONSULTANT_DIRECTORY_QUERY');
