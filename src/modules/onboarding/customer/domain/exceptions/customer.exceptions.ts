export class CustomerException extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'CustomerException';
  }
}

export class InvalidCustomerException extends CustomerException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidCustomerException';
  }
}

export class InvalidDocumentException extends CustomerException {
  constructor(document: string) {
    super(
      `Invalid document: "${document}". Expected a valid CPF (11 digits) or CNPJ (14 digits).`,
    );
    this.name = 'InvalidDocumentException';
  }
}

export class InvalidPhoneException extends CustomerException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidPhoneException';
  }
}

export class InvalidEmailException extends CustomerException {
  constructor(email: string) {
    super(`Invalid email address: "${email}".`);
    this.name = 'InvalidEmailException';
  }
}

export class InvalidAddressException extends CustomerException {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAddressException';
  }
}
