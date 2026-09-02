export interface VehicleLookup {
  exists(vehicleId: string): Promise<boolean>;
}

export const VEHICLE_LOOKUP = Symbol('VEHICLE_LOOKUP');