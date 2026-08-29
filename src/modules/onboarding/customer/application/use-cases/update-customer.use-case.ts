import { Customer } from '@/modules/onboarding/customer/domain/customer.entity';
import { Document } from '@/modules/onboarding/customer/domain/value-objects/document.value-object';
import { Email } from '@/modules/onboarding/customer/domain/value-objects/email.value-object';
import { Phone } from '@/modules/onboarding/customer/domain/value-objects/phone.value-object';
import { Address } from '@/modules/onboarding/customer/domain/value-objects/address.value-object';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '@/modules/onboarding/customer/domain/repository/customer.repository';
import {
  UpdateCustomerInput,
  CustomerResponseDTO,
} from '@/modules/onboarding/customer/application/dto/customer.dto';
import { CustomerNotFoundException } from '@/modules/onboarding/customer/application/exceptions/customer-application.exception';
import { Inject, Injectable } from '@nestjs/common';

@Injectable()
export class UpdateCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly repository: CustomerRepository,
  ) {}

  async execute(input: {
    id: string;
    data: UpdateCustomerInput;
  }): Promise<CustomerResponseDTO> {
    const existing = await this.repository.findById(input.id);

    if (!existing) {
      throw new CustomerNotFoundException(input.id);
    }

    const updated = Customer.restore({
      id: existing.getId(),
      personType: existing.getPersonType(),
      document: existing.getDocument(),
      name: input.data.name ?? existing.getName(),
      corporateName: input.data.corporateName ?? existing.getCorporateName(),
      tradeName: input.data.tradeName ?? existing.getTradeName(),
      email: input.data.email
        ? new Email(input.data.email)
        : existing.getEmail(),
      phone: input.data.phone
        ? new Phone(input.data.phone)
        : existing.getPhone(),
      address: input.data.address
        ? new Address(input.data.address)
        : existing.getAddress(),
      createdAt: existing.getCreatedAt(),
      updatedAt: new Date(),
      deletedAt: existing.getDeletedAt(),
    });

    const saved = await this.repository.save(updated);

    const primitives = saved.toPrimitives();

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
