import { Customer } from '../../domain/customer.entity';
import { Document } from '../../domain/value-objects/document.value-object';
import { Email } from '../../domain/value-objects/email.value-object';
import { Phone } from '../../domain/value-objects/phone.value-object';
import { Address } from '../../domain/value-objects/address.value-object';
import { CustomerRepository } from '../../domain/repository/customer.repository';
import { UpdateCustomerInput, CustomerResponseDTO } from '../dto/customer.dto';
import { CustomerNotFoundException } from '../exceptions/customer-not-found.exception';

export class UpdateCustomerUseCase {
  constructor(private readonly repository: CustomerRepository) {}

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
