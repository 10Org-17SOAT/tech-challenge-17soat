import { FuelTypeEnum } from "../../application/enum/fueltype.enum";

export class FuelType {
  private readonly value: FuelTypeEnum;

  constructor(value: FuelTypeEnum | string) {
    const normalizedValue = (value as string).toUpperCase();

    if (!Object.values(FuelTypeEnum).includes(normalizedValue as FuelTypeEnum)) {
      throw new Error(
        `Invalid fuel type. Must be one of: ${Object.values(FuelTypeEnum).join(', ')}`,
      );
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
