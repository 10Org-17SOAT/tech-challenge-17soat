import { EmailValueObject } from '../../../../../shared/domain/value-objects/email.vo';
import { InvalidEmailException } from '../exceptions/customer.exceptions';

export class Email extends EmailValueObject {
  constructor(value: string) {
    super(value, (raw) => new InvalidEmailException(raw));
  }
}
