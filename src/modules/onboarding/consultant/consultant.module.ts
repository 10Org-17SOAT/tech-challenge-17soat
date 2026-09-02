import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { CreateConsultantUseCase } from './application/create-consultant.usecase';
import { DeleteConsultantUseCase } from './application/delete-consultant.usecase';
import { GetConsultantUseCase } from './application/get-consultant.usecase';
import { ListConsultantsUseCase } from './application/list-consultants.usecase';
import { UpdateConsultantUseCase } from './application/update-consultant.usecase';
import { CONSULTANT_REPOSITORY } from './domain/consultant.repository';
import { DrizzleConsultantRepository } from './infrastructure/persistence/drizzle-consultant.repository';
import { ConsultantsController } from './presentation/consultants.controller';
import { CONSULTANT_DIRECTORY_QUERY } from './public/consultant-directory.query';
import { ConsultantDirectoryQueryImpl } from './public/consultant-directory.query.impl';

@Module({
  imports: [DatabaseModule],
  controllers: [ConsultantsController],
  providers: [
    { provide: CONSULTANT_REPOSITORY, useClass: DrizzleConsultantRepository },
    {
      provide: CONSULTANT_DIRECTORY_QUERY,
      useClass: ConsultantDirectoryQueryImpl,
    },
    CreateConsultantUseCase,
    GetConsultantUseCase,
    ListConsultantsUseCase,
    UpdateConsultantUseCase,
    DeleteConsultantUseCase,
  ],
  // The published contract, and nothing else. The repository and use cases
  // stay private to this module.
  exports: [CONSULTANT_DIRECTORY_QUERY],
})
export class ConsultantModule {}
