import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_PIPE } from '@nestjs/core';
import { ZodValidationPipe } from 'nestjs-zod';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { StockModule } from './modules/stock/stock.module';
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
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_PIPE, useClass: ZodValidationPipe }],
})
export class AppModule {}
