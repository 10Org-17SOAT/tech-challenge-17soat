jest.mock('@nestjs/jwt', () => ({
  JwtService: class {
    sign = jest.fn();
  },
}));

import { UnauthorizedException } from '@nestjs/common';
import type { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { User } from '../domain/user.entity';
import type { UserRepository } from '../domain/user.repository';
import { LoginUseCase } from './login.usecase';

describe('LoginUseCase', () => {
  it('returns a token when credentials are valid', async () => {
    const user = User.create({
      name: 'Maria Silva',
      email: 'maria@email.com',
      password_hash: await bcrypt.hash('12345678', 10),
      role_id: 1,
    });

    const repository: UserRepository = {
      findByEmail: jest.fn().mockResolvedValue(user),
      findById: jest.fn(),
      findMany: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const jwtService: Pick<JwtService, 'sign'> = {
      sign: jest.fn().mockReturnValue('signed-jwt-token'),
    };

    const useCase = new LoginUseCase(repository, jwtService as JwtService);

    await expect(
      useCase.execute({ email: 'maria@email.com', password: '12345678' }),
    ).resolves.toEqual({
      access_token: 'signed-jwt-token',
      user: {
        user_id: user.user_id,
        email: user.email,
        name: user.name,
        role_id: user.role_id,
      },
    });

    expect(jwtService.sign).toHaveBeenCalledWith({
      sub: user.user_id,
      email: user.email,
      role_id: user.role_id,
    });
  });

  it('throws unauthorized when the password is wrong', async () => {
    const user = User.create({
      name: 'Maria Silva',
      email: 'maria@email.com',
      password_hash: await bcrypt.hash('12345678', 10),
      role_id: 1,
    });

    const repository: UserRepository = {
      findByEmail: jest.fn().mockResolvedValue(user),
      findById: jest.fn(),
      findMany: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const jwtService: Pick<JwtService, 'sign'> = { sign: jest.fn() };

    const useCase = new LoginUseCase(repository, jwtService as JwtService);

    await expect(
      useCase.execute({ email: 'maria@email.com', password: 'wrong-password' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws unauthorized when the user does not exist', async () => {
    const repository: UserRepository = {
      findByEmail: jest.fn().mockResolvedValue(null),
      findById: jest.fn(),
      findMany: jest.fn(),
      save: jest.fn(),
      delete: jest.fn(),
    };

    const jwtService: Pick<JwtService, 'sign'> = { sign: jest.fn() };

    const useCase = new LoginUseCase(repository, jwtService as JwtService);

    await expect(
      useCase.execute({ email: 'missing@email.com', password: '12345678' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
