import { Inject, Injectable } from '@nestjs/common';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '@/modules/onboarding/customer/domain/repository/customer.repository';
import { CustomerResponseDTO } from '@/modules/onboarding/customer/application/dto/customer.dto';
import { CustomerNotFoundException } from '@/modules/onboarding/customer/application/exceptions/customer-application.exception';

@Injectable()
export class FindCustomerByIdUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly repository: CustomerRepository,
  ) {}

  async execute(input: { id: string }): Promise<CustomerResponseDTO> {
    const customer = await this.repository.findById(input.id);

    if (!customer) {
      throw new CustomerNotFoundException(input.id);
    }

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
