import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { QuotationsModule } from '../quotations/quotations.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { CompleteDiagnosisUseCase } from './application/complete-diagnosis.usecase';
import { DIAGNOSIS_REPOSITORY } from './domain/diagnosis.repository';
import { DrizzleDiagnosisRepository } from './infrastructure/persistence/drizzle-diagnosis.repository';
import { DiagnosticsController } from './presentation/diagnostics.controller';

@Module({
  imports: [DatabaseModule, ServiceOrdersModule, QuotationsModule],
  controllers: [DiagnosticsController],
  providers: [
    { provide: DIAGNOSIS_REPOSITORY, useClass: DrizzleDiagnosisRepository },
    CompleteDiagnosisUseCase,
  ],
})
export class DiagnosticsModule {}
