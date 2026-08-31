import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { CreateAnamnesisUseCase } from './application/create-anamnesis.usecase';
import { DeleteAnamnesisUseCase } from './application/delete-anamnesis.usecase';
import { GetAnamnesisUseCase } from './application/get-anamnesis.usecase';
import { UpdateAnamnesisUseCase } from './application/update-anamnesis.usecase';
import { ANAMNESIS_REPOSITORY } from './domain/anamnesis.repository';
import { DrizzleAnamnesisRepository } from './infrastructure/persistence/drizzle-anamnesis.repository';
import { AnamnesisController } from './presentation/anamnesis.controller';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';

@Module({
  imports: [DatabaseModule, ServiceOrdersModule],
  controllers: [AnamnesisController],
  providers: [
    {
      provide: ANAMNESIS_REPOSITORY,
      useClass: DrizzleAnamnesisRepository,
    },
    CreateAnamnesisUseCase,
    GetAnamnesisUseCase,
    UpdateAnamnesisUseCase,
    DeleteAnamnesisUseCase,
  ],
  exports: [ANAMNESIS_REPOSITORY],
})
export class AnamnesisModule {}