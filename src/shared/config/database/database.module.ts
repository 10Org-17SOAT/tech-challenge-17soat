import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { DATABASE_CONNECTION } from './database.constants';
import { createDrizzleConnection } from './drizzle.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATABASE_CONNECTION,
      inject: [ConfigService],
      useFactory: (configService: ConfigService) =>
        createDrizzleConnection(configService),
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
