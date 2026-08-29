import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/config/database/database.module';
import { MECHANIC_REPOSITORY } from './domain/repository/mechanic.repository';
import { DrizzleMechanicRepository } from './infrastructure/repositories/drizzle-mechanic.repository';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [
    {
      provide: MECHANIC_REPOSITORY,
      useClass: DrizzleMechanicRepository,
    },
  ],
})
export class MechanicModule {}