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
import { CUSTOMER_CONTACT_QUERY } from './public/customer-contact.query';
import { DrizzleCustomerContactQuery } from './public/customer-contact.query.impl';
import { CUSTOMER_REGISTRATION } from './public/customer-registration';
import { DomainCustomerRegistration } from './public/customer-registration.impl';

@Module({
  imports: [DatabaseModule],
  controllers: [CustomerController],
  providers: [
    { provide: CUSTOMER_REPOSITORY, useClass: DrizzleCustomerRepository },
    { provide: CUSTOMER_CONTACT_QUERY, useClass: DrizzleCustomerContactQuery },
    { provide: CUSTOMER_REGISTRATION, useClass: DomainCustomerRegistration },
    CreateCustomerUseCase,
    FindCustomerByIdUseCase,
    FindAllCustomersUseCase,
    UpdateCustomerUseCase,
    SoftDeleteCustomerUseCase,
  ],
  // The only things that leave this module. Repositories, use cases and the
  // Customer aggregate stay private.
  exports: [CUSTOMER_CONTACT_QUERY, CUSTOMER_REGISTRATION],
})
export class CustomerModule {}
