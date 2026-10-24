/**
 * Published contract for registering a customer from outside onboarding —
 * the reception desk opening a service order for someone who walked in.
 *
 * Registration is split in two on purpose. `prepare` validates everything and
 * resolves the customer's id without writing; `commit` writes. A caller that
 * has more to validate (a vehicle, a catalogue of services) prepares first and
 * commits only once nothing else can fail, so a rejected request leaves no
 * half-registered customer behind.
 */
export interface NewCustomer {
  userId: string;
  personType: 'CPF' | 'CNPJ';
  document: string;
  name?: string;
  corporateName?: string;
  tradeName?: string;
  email: string;
  phone: {
    countryCode: string;
    areaCode?: string;
    number: string;
  };
  address: {
    street: string;
    number: string;
    complement?: string;
    neighborhood: string;
    city: string;
    state: string;
    zipCode: string;
  };
}

export interface PendingCustomerRegistration {
  readonly customerId: string;
  /** False when the document was already registered and that customer is reused. */
  readonly isNew: boolean;
  /** A no-op when the customer already existed. */
  commit(): Promise<void>;
}

export interface CustomerRegistration {
  /**
   * The document is the customer's identity: if it is already registered, the
   * existing customer is returned untouched — reception does not get to edit a
   * profile by retyping it. Invalid data throws `CustomerRegistrationRejectedError`.
   */
  prepare(customer: NewCustomer): Promise<PendingCustomerRegistration>;
}

/** The data does not describe a valid customer. The message says why. */
export class CustomerRegistrationRejectedError extends Error {
  constructor(message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = 'CustomerRegistrationRejectedError';
  }
}

export const CUSTOMER_REGISTRATION = Symbol('CUSTOMER_REGISTRATION');
