export class MechanicException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MechanicException';
  }
}

export class InvalidCpfException extends MechanicException {
  constructor(cpf: string) {
    super(`Invalid CPF: "${cpf}". Expected 11 digits with valid check digits.`);
    this.name = 'InvalidCpfException';
  }
}

export class InvalidEmailException extends MechanicException {
  constructor(email: string) {
    super(`Invalid email address: "${email}".`);
    this.name = 'InvalidEmailException';
  }
}

export class InvalidPhoneException extends MechanicException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPhoneException';
  }
}

export class InvalidMechanicException extends MechanicException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidMechanicException';
  }
}

export class MechanicNotAvailableException extends MechanicException {
  constructor(id: string) {
    super(`Mechanic with id "${id}" is not available for allocation.`);
    this.name = 'MechanicNotAvailableException';
  }
}

export class MechanicNotAllocatedException extends MechanicException {
  constructor(id: string) {
    super(`Mechanic with id "${id}" is not allocated to a service order.`);
    this.name = 'MechanicNotAllocatedException';
  }
}

export class WrongServiceOrderException extends MechanicException {
  constructor(id: string, serviceOrderId: string) {
    super(
      `Mechanic with id "${id}" is allocated to a different service order than "${serviceOrderId}".`,
    );
    this.name = 'WrongServiceOrderException';
  }
}

export class AllocatedMechanicException extends MechanicException {
  constructor(id: string) {
    super(`Mechanic with id "${id}" is allocated and cannot be deactivated.`);
    this.name = 'AllocatedMechanicException';
  }
}

export class DuplicateCpfException extends MechanicException {
  constructor(cpf: string, options?: { cause?: unknown }) {
    super(`Mechanic CPF "${cpf}" is already in use.`);
    this.name = 'DuplicateCpfException';
    if (options?.cause !== undefined) {
      this.cause = options.cause;
    }
  }
}
