import { Inject, Injectable } from '@nestjs/common';
import { Customer } from '../domain/customer.entity';
import { CustomerException } from '../domain/exceptions/customer.exceptions';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '../domain/repository/customer.repository';
import { Address } from '../domain/value-objects/address.value-object';
import { Document } from '../domain/value-objects/document.value-object';
import { Email } from '../domain/value-objects/email.value-object';
import { Phone } from '../domain/value-objects/phone.value-object';
import { PersonType } from '../domain/value-objects/person-type.enum';
import {
  CustomerRegistrationRejectedError,
  type CustomerRegistration,
  type NewCustomer,
  type PendingCustomerRegistration,
} from './customer-registration';

@Injectable()
export class DomainCustomerRegistration implements CustomerRegistration {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly repository: CustomerRepository,
  ) {}

  async prepare(input: NewCustomer): Promise<PendingCustomerRegistration> {
    const customer = this.build(input);

    const existing = await this.repository.findByDocument(
      customer.getDocument().getValue(),
    );
    if (existing) {
      return {
        customerId: existing.getId(),
        isNew: false,
        commit: () => Promise.resolve(),
      };
    }

    return {
      customerId: customer.getId(),
      isNew: true,
      commit: async () => {
        await this.repository.save(customer);
      },
    };
  }

  // Onboarding's own exceptions stay inside onboarding: callers only ever see
  // the published rejection, with the domain's message carried over.
  private build(input: NewCustomer): Customer {
    try {
      return Customer.create({
        userId: input.userId,
        personType: PersonType[input.personType],
        document: new Document(input.document),
        name: input.name,
        corporateName: input.corporateName,
        tradeName: input.tradeName,
        email: new Email(input.email),
        phone: new Phone(input.phone),
        address: new Address(input.address),
      });
    } catch (error) {
      if (error instanceof CustomerException) {
        throw new CustomerRegistrationRejectedError(error.message, {
          cause: error,
        });
      }
      throw error;
    }
  }
}
