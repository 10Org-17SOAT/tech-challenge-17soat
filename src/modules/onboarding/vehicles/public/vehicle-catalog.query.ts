/**
 * The vehicle module's published contract — the only thing other modules may
 * import from `vehicles`.
 *
 * It publishes `ownerId` and nothing more about the owner: that column belongs
 * to `vehicles`, but the person behind it does not. Whoever needs a name or an
 * email asks the customer module itself.
 */
export interface VehicleView {
  id: string;
  ownerId: string;
  manufacturer: string;
  model: string;
  year: number;
  licensePlate: string;
}

export interface VehicleCatalogQuery {
  findById(id: string): Promise<VehicleView | null>;
}

export const VEHICLE_CATALOG_QUERY = Symbol('VEHICLE_CATALOG_QUERY');
