export enum VehicleStatusEnum {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  MAINTENANCE = 'MAINTENANCE',
}

export class VehicleStatus {
  private readonly value: VehicleStatusEnum;

  constructor(value: VehicleStatusEnum | string) {
    const normalizedValue = (value as string).toUpperCase();

    if (!Object.values(VehicleStatusEnum).includes(normalizedValue as VehicleStatusEnum)) {
      throw new Error(
        `Invalid vehicle status. Must be one of: ${Object.values(VehicleStatusEnum).join(', ')}`,
      );
    }

    this.value = normalizedValue as VehicleStatusEnum;
  }

  getValue(): VehicleStatusEnum {
    return this.value;
  }

  isActive(): boolean {
    return this.value === VehicleStatusEnum.ACTIVE;
  }

  isInactive(): boolean {
    return this.value === VehicleStatusEnum.INACTIVE;
  }

  isInMaintenance(): boolean {
    return this.value === VehicleStatusEnum.MAINTENANCE;
  }

  equals(other: VehicleStatus): boolean {
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }
}
