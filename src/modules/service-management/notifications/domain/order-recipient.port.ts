/**
 * Who hears about a service order — its quotation, its status changes — in
 * this module's own words.
 *
 * The chain that produces it — order → vehicle → owner — is a modelling
 * decision, and it lives in the adapter under `infrastructure/`, not here.
 * Nothing in `domain/` or `application/` knows that a vehicle is involved in
 * finding the customer, so moving the customer onto the order later would not
 * reach past that one file.
 */
export interface OrderRecipient {
  customerId: string;
  name: string;
  email: string;
  vehicle: {
    manufacturer: string;
    model: string;
    year: number;
    licensePlate: string;
  };
}

export interface OrderRecipientQuery {
  /** `null` when any link in the chain is missing — the caller decides what
   *  that means. */
  findForServiceOrder(serviceOrderId: string): Promise<OrderRecipient | null>;
}

export const ORDER_RECIPIENT_QUERY = Symbol('ORDER_RECIPIENT_QUERY');
