import { Module } from '@nestjs/common';
import { OrdersModule } from './orders/orders.module';
import { ServicesModule } from './services/services.module';

@Module({
  imports: [ServicesModule, OrdersModule],
})
export class ServiceOrderModule {}
