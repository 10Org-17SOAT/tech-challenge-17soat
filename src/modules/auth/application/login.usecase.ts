import { Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { USER_REPOSITORY } from '../domain/user.repository';
import type { UserRepository } from '../domain/user.repository';
import type { LoginRequestDto, LoginResponseDto } from '../presentation/dtos/auth.dtos';

@Injectable()
export class LoginUseCase {
  constructor(
    @Inject(USER_REPOSITORY)
    private readonly repository: UserRepository,
    private readonly jwtService: JwtService,
  ) {}

  async execute(input: LoginRequestDto): Promise<LoginResponseDto> {
    const user = await this.repository.findByEmail(input.email);

    if (!user) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.password_hash);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const accessToken = this.jwtService.sign({
      sub: user.user_id,
      email: user.email,
      role_id: user.role_id,
    });

    return {
      access_token: accessToken,
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        role_id: user.role_id,
      },
    };
  }
}
