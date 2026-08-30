import type {
  VehicleCatalogQuery,
  VehicleView,
} from '../public/vehicle-catalog.query';

export class InMemoryVehicleCatalogQuery implements VehicleCatalogQuery {
  private readonly vehicles = new Map<string, VehicleView>();

  add(vehicle: VehicleView): void {
    this.vehicles.set(vehicle.id, vehicle);
  }

  findById(id: string): Promise<VehicleView | null> {
    return Promise.resolve(this.vehicles.get(id) ?? null);
  }
}
