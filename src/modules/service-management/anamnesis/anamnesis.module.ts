import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { ANAMNESIS_REPOSITORY } from './domain/anamnesis.repository';
import { DrizzleAnamnesisRepository } from './infrastructure/persistence/drizzle-anamnesis.repository';

@Module({
  imports: [DatabaseModule],
  providers: [
    {
      provide: ANAMNESIS_REPOSITORY,
      useClass: DrizzleAnamnesisRepository,
    },
  ],
  exports: [ANAMNESIS_REPOSITORY],
})
export class AnamnesisModule {}