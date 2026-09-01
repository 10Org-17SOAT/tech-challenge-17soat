/**
 * The customer module's published contract — the only thing other modules may
 * import from `customer`. Everything under `domain/`, `application/` and
 * `infrastructure/` is private to this module.
 *
 * It answers two questions: how do we reach this person, and which customer is
 * behind a given auth account. Nothing about documents, addresses or person
 * type crosses the boundary, because no caller outside onboarding has a use
 * for them.
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

  /**
   * The customer linked to an auth account, for callers proving that a
   * resource belongs to whoever is asking. Only the id crosses: a caller
   * checking ownership has no business reading the person's contact details.
   *
   * `null` when the account has no customer linked to it — `user_id` is
   * nullable, so an account with no profile simply owns nothing.
   */
  findIdByUserId(userId: string): Promise<string | null>;
}

export const CUSTOMER_CONTACT_QUERY = Symbol('CUSTOMER_CONTACT_QUERY');
