/**
 * The customer module's published contract — the only thing other modules may
 * import from `customer`. Everything under `domain/`, `application/` and
 * `infrastructure/` is private to this module.
 *
 * It answers one question: how do we reach this person. Nothing about
 * documents, addresses or person type crosses the boundary, because no caller
 * outside onboarding has a use for them.
 */
export interface CustomerContact {
  id: string;
  /** Display name: the individual's name, or a company's trade name. */
  name: string;
  email: string;
}

export interface CustomerContactQuery {
  /** A soft-deleted or unknown customer is simply `null` — absence is the answer. */
  findById(id: string): Promise<CustomerContact | null>;
}

export const CUSTOMER_CONTACT_QUERY = Symbol('CUSTOMER_CONTACT_QUERY');
