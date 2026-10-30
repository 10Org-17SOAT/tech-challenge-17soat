import { Module } from '@nestjs/common';
import { AnamnesisModule } from './anamnesis/anamnesis.module';
import { DiagnosticsModule } from './diagnostics/diagnostics.module';
import { NotificationsModule } from './notifications/notifications.module';
import { QuotationsModule } from './quotations/quotations.module';
import { ServiceOrdersModule } from './service-orders/service-orders.module';
import { ServicesModule } from './services/services.module';

@Module({
  imports: [
    ServicesModule,
    ServiceOrdersModule,
    QuotationsModule,
    DiagnosticsModule,
    AnamnesisModule,
    NotificationsModule,
  ],
})
export class ServiceOrderModule {}
