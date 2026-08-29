import { Module } from '@nestjs/common';
import { ServicesModule } from '@/modules/service-order/services/services.module';

@Module({
  imports: [ServicesModule],
})
export class ServiceOrderModule {}
