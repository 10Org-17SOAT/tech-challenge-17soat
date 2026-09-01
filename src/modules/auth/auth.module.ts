import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import type { Env } from '../../shared/config/env/env.schema';
import { CreateUserUseCase } from './application/create-user.usecase';
import { DeleteUserUseCase } from './application/delete-user.usecase';
import { GetUserUseCase } from './application/get-user.usecase';
import { ListUsersUseCase } from './application/list-users.usecase';
import { LoginUseCase } from './application/login.usecase';
import { UpdateUserUseCase } from './application/update-user.usecase';
import { USER_REPOSITORY } from './domain/user.repository';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { DrizzleUserRepository } from './infrastructure/persistence/drizzle-user.repository';
import { AuthController } from './presentation/auth.controller';
import { UsersController } from './presentation/users.controller';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PassportModule,
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<Env, true>) => ({
        secret: configService.get('JWT_SECRET', { infer: true }),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN', { infer: true }),
        },
      }),
    }),
  ],
  controllers: [AuthController, UsersController],
  providers: [
    { provide: USER_REPOSITORY, useClass: DrizzleUserRepository },
    LoginUseCase,
    CreateUserUseCase,
    GetUserUseCase,
    ListUsersUseCase,
    UpdateUserUseCase,
    DeleteUserUseCase,
    JwtStrategy,
    // Registered globally: every route requires a valid token unless it opts
    // out with @Public(), and RolesGuard runs after it so @Roles() can rely on
    // request.user being populated.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AuthModule {}
