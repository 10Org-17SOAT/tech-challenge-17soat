import { Global, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { Env } from '@/shared/config/env/env.schema';
import { DATABASE_CONNECTION } from '@/shared/config/database/database.constants';
import { createDrizzleConnection } from '@/shared/config/database/drizzle.provider';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: DATABASE_CONNECTION,
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) =>
        createDrizzleConnection(configService),
    },
  ],
  exports: [DATABASE_CONNECTION],
})
export class DatabaseModule {}
