import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { CreateCustomerUseCase } from './application/use-cases/create-customer.use-case';
import { FindCustomerByIdUseCase } from './application/use-cases/find-customer-by-id.use-case';
import { FindAllCustomersUseCase } from './application/use-cases/find-all-customers.use-case';
import { UpdateCustomerUseCase } from './application/use-cases/update-customer.use-case';
import { SoftDeleteCustomerUseCase } from './application/use-cases/soft-delete-customer.use-case';
import { CUSTOMER_REPOSITORY } from './domain/repository/customer.repository';
import { DrizzleCustomerRepository } from './infrastructure/repositories/drizzle-customer.repository';
import { CustomerController } from './presentation/controllers/customer.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [CustomerController],
  providers: [
    { provide: CUSTOMER_REPOSITORY, useClass: DrizzleCustomerRepository },
    CreateCustomerUseCase,
    FindCustomerByIdUseCase,
    FindAllCustomersUseCase,
    UpdateCustomerUseCase,
    SoftDeleteCustomerUseCase,
  ],
})
export class CustomerModule {}
