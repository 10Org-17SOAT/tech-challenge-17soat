import {
  CustomerRepository,
  FindAllParams,
} from '../../domain/repository/customer.repository';
import { CustomerResponseDTO } from '../dto/customer.dto';

export class FindAllCustomersUseCase {
  constructor(private readonly repository: CustomerRepository) {}

  async execute(input: FindAllParams): Promise<{
    data: CustomerResponseDTO[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    const result = await this.repository.findAll(input);

    return {
      data: result.data.map((customer) => {
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
      }),
      total: result.total,
      page: result.page,
      limit: result.limit,
      totalPages: result.totalPages,
    };
  }
}
