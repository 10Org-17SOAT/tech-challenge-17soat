import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/config/database/database.module';
import { MECHANIC_REPOSITORY } from './domain/repository/mechanic.repository';
import { DrizzleMechanicRepository } from './infrastructure/repositories/drizzle-mechanic.repository';
import { CreateMechanicUseCase } from './application/use-cases/create-mechanic.use-case';
import { GetMechanicByIdUseCase } from './application/use-cases/get-mechanic-by-id.use-case';
import { ListMechanicsUseCase } from './application/use-cases/list-mechanics.use-case';
import { UpdateMechanicProfileUseCase } from './application/use-cases/update-mechanic-profile.use-case';
import { DeactivateMechanicUseCase } from './application/use-cases/deactivate-mechanic.use-case';
import { FindAvailableMechanicUseCase } from './application/use-cases/find-available-mechanic.use-case';
import { ReleaseMechanicUseCase } from './application/use-cases/release-mechanic.use-case';
import { MechanicController } from './presentation/controllers/mechanic.controller';

@Module({
  imports: [DatabaseModule],
  controllers: [MechanicController],
  providers: [
    {
      provide: MECHANIC_REPOSITORY,
      useClass: DrizzleMechanicRepository,
    },
    CreateMechanicUseCase,
    GetMechanicByIdUseCase,
    ListMechanicsUseCase,
    UpdateMechanicProfileUseCase,
    DeactivateMechanicUseCase,
    FindAvailableMechanicUseCase,
    ReleaseMechanicUseCase,
  ],
})
export class MechanicModule {}
