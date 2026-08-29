import { Module } from '@nestjs/common';
import { DatabaseModule } from '@/shared/config/database/database.module';
import { CreateCustomerUseCase } from '@/modules/onboarding/customer/application/use-cases/create-customer.use-case';
import { FindCustomerByIdUseCase } from '@/modules/onboarding/customer/application/use-cases/find-customer-by-id.use-case';
import { FindAllCustomersUseCase } from '@/modules/onboarding/customer/application/use-cases/find-all-customers.use-case';
import { UpdateCustomerUseCase } from '@/modules/onboarding/customer/application/use-cases/update-customer.use-case';
import { SoftDeleteCustomerUseCase } from '@/modules/onboarding/customer/application/use-cases/soft-delete-customer.use-case';
import { CUSTOMER_REPOSITORY } from '@/modules/onboarding/customer/domain/repository/customer.repository';
import { DrizzleCustomerRepository } from '@/modules/onboarding/customer/infrastructure/repositories/drizzle-customer.repository';
import { CustomerController } from '@/modules/onboarding/customer/presentation/controllers/customer.controller';

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
