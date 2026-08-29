import { Inject, Injectable } from '@nestjs/common';
import {
  CUSTOMER_REPOSITORY,
  type CustomerRepository,
} from '@/modules/onboarding/customer/domain/repository/customer.repository';
import { CustomerNotFoundException } from '@/modules/onboarding/customer/application/exceptions/customer-application.exception';

@Injectable()
export class SoftDeleteCustomerUseCase {
  constructor(
    @Inject(CUSTOMER_REPOSITORY)
    private readonly repository: CustomerRepository,
  ) {}

  async execute(input: { id: string }): Promise<void> {
    const customer = await this.repository.findById(input.id);

    if (!customer) {
      throw new CustomerNotFoundException(input.id);
    }

    customer.softDelete();

    await this.repository.save(customer);
  }
}
