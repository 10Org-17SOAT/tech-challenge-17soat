import { FuelTypeEnum } from '../enums/fuel-type.enum';
import { InvalidFuelTypeException } from '../exceptions/vehicle.exceptions';

export class FuelType {
  private readonly value: FuelTypeEnum;

  constructor(value: FuelTypeEnum | string) {
    const normalizedValue = value.toUpperCase();

    if (
      !Object.values(FuelTypeEnum).includes(normalizedValue as FuelTypeEnum)
    ) {
      throw new InvalidFuelTypeException(String(value));
    }

    this.value = normalizedValue as FuelTypeEnum;
  }

  getValue(): FuelTypeEnum {
    return this.value;
  }

  equals(other: FuelType): boolean {
    return this.value === other.getValue();
  }

  toString(): string {
    return this.value;
  }
}
