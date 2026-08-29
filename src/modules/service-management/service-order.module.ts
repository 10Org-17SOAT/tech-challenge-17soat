import { Module } from '@nestjs/common';
import { ServiceOrdersModule } from './service-orders/service-orders.module';
import { ServicesModule } from './services/services.module';

@Module({
  imports: [ServicesModule, ServiceOrdersModule],
})
export class ServiceOrderModule {}
