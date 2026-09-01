import { ServiceOrderStatus } from '../../../service-orders/domain/service-order.entity';

export class AnamnesisException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AnamnesisException';
  }
}

export class InvalidAnamnesisException extends AnamnesisException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAnamnesisException';
  }
}

export class AnamnesisNotFoundException extends AnamnesisException {
  constructor(readonly serviceOrderId: string) {
    super(`Anamnesis for service order ${serviceOrderId} not found`);
    this.name = 'AnamnesisNotFoundException';
  }
}

export class AnamnesisAlreadyExistsException extends AnamnesisException {
  constructor(readonly serviceOrderId: string) {
    super(`Anamnesis for service order ${serviceOrderId} already exists`);
    this.name = 'AnamnesisAlreadyExistsException';
  }
}

export class AnamnesisLockedException extends AnamnesisException {
  constructor(
    readonly serviceOrderId: string,
    readonly status: ServiceOrderStatus,
  ) {
    super(
      `Anamnesis for service order ${serviceOrderId} is locked in status "${status}"`,
    );
    this.name = 'AnamnesisLockedException';
  }
}

export class AnamnesisRequiredException extends AnamnesisException {
  constructor(readonly serviceOrderId: string) {
    super(
      `Anamnesis is required before starting diagnosis for service order ${serviceOrderId}`,
    );
    this.name = 'AnamnesisRequiredException';
  }
}