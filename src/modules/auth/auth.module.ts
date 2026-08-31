import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
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
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: (configService.get<string>('JWT_EXPIRES_IN') ?? '1h') as any,
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
    JwtAuthGuard,
    RolesGuard,
  ],
  exports: [JwtAuthGuard, RolesGuard],
})
export class AuthModule {}
