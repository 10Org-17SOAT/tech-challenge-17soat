import { CustomerRepository } from '../../domain/repository/customer.repository';
import { CustomerResponseDTO } from '../dto/customer.dto';
import { CustomerNotFoundException } from '../exceptions/customer-not-found.exception';

export class FindCustomerByIdUseCase {
  constructor(private readonly repository: CustomerRepository) {}

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
