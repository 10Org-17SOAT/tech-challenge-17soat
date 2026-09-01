// Cross-aggregate precondition: starting a diagnosis requires the anamnesis
// captured at reception. The port is defined here (service-orders) and
// implemented by a dedicated adapter that reads the anamneses table directly,
// keeping the module dependency one-directional (anamnesis -> service-orders).
export interface AnamnesisExistencePort {
  existsByServiceOrderId(serviceOrderId: string): Promise<boolean>;
}

export const ANAMNESIS_EXISTENCE_PORT = Symbol('ANAMNESIS_EXISTENCE_PORT');