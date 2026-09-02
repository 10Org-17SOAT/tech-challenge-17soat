import { Inject, Injectable } from '@nestjs/common';
import { Customer } from '../../domain/customer.entity';
import { Document } from '../../domain/value-objects/document.value-object';
import { Email } from '../../domain/value-objects/email.value-object';
import { Phone } from '../../domain/value-objects/phone.value-object';
import { Address } from '../../domain/value-objects/address.value-object';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '../../domain/repository/customer.repository';
import { CreateCustomerInput, CustomerResponseDTO } from '../dto/customer.dto';

@Injectable()
export class CreateCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly repository: CustomerRepository,
  ) {}

  async execute(input: CreateCustomerInput): Promise<CustomerResponseDTO> {
    const customer = Customer.create({
      userId: input.userId,
      personType: input.personType,
      document: new Document(input.document),
      name: input.name,
      corporateName: input.corporateName,
      tradeName: input.tradeName,
      email: new Email(input.email),
      phone: new Phone(input.phone),
      address: new Address(input.address),
    });

    const saved = await this.repository.save(customer);

    return this.toResponseDTO(saved);
  }

  private toResponseDTO(customer: Customer): CustomerResponseDTO {
    const primitives = customer.toPrimitives();
    return {
      id: primitives.id,
      personType: primitives.personType,
      document: primitives.document,
      name: primitives.name,
      corporateName: primitives.corporateName,
      tradeName: primitives.tradeName,
      email: primitives.email,
      phone: primitives.phone,
      address: primitives.address,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };
  }
}
