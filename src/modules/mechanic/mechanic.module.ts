import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/config/database/database.module';

@Module({
  imports: [DatabaseModule],
  controllers: [],
  providers: [],
})
export class MechanicModule {}