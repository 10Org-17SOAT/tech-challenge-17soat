// OS soft-delete cascades to the anamnesis (spec AC-15). The port is defined
// here (service-orders) and implemented by a dedicated adapter that writes the
// anamneses table directly, keeping the module dependency one-directional.
export interface AnamnesisCascadePort {
  softDeleteByServiceOrderId(serviceOrderId: string): Promise<void>;
}

export const ANAMNESIS_CASCADE_PORT = Symbol('ANAMNESIS_CASCADE_PORT');