import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CustomerModule } from './modules/onboarding/customer/customer.module';
import { ServiceOrderModule } from './modules/service-order/service-order.module';
import { StockModule } from './modules/stock/stock.module';
import { VehicleManagementModule } from './modules/vehicle-management/vehicle-management.module';
import { DatabaseModule } from './shared/config/database/database.module';
import { validateEnv } from './shared/config/env/env.validation';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
      validate: validateEnv,
    }),
    DatabaseModule,
    StockModule,
    ServiceOrderModule,
    VehicleManagementModule,
    CustomerModule,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_PIPE, useClass: ZodValidationPipe }],
})
export class AppModule {}
