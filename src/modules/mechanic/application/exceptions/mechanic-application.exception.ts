export class MechanicApplicationException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MechanicApplicationException';
  }
}

export class MechanicNotFoundException extends MechanicApplicationException {
  constructor(id: string) {
    super(`Mechanic with id "${id}" not found.`);
    this.name = 'MechanicNotFoundException';
  }
}

export class NoAvailableMechanicException extends MechanicApplicationException {
  constructor() {
    super('No available mechanic found for the given criteria.');
    this.name = 'NoAvailableMechanicException';
  }
}
