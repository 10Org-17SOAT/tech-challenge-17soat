import { CustomerRepository } from '../../domain/repository/customer.repository';
import { CustomerNotFoundException } from '../exceptions/customer-application.exception';

export class SoftDeleteCustomerUseCase {
  constructor(private readonly repository: CustomerRepository) {}

  async execute(input: { id: string }): Promise<void> {
    const customer = await this.repository.findById(input.id);

    if (!customer) {
      throw new CustomerNotFoundException(input.id);
    }

    customer.softDelete();

    await this.repository.save(customer);
  }
}
