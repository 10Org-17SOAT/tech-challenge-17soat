import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  UserEmailAlreadyExistsError,
  UserNotFoundError,
} from '../domain/errors/user-errors';

@Catch(UserNotFoundError, UserEmailAlreadyExistsError)
export class UserErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.toHttpException(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: Error) {
    if (error instanceof UserNotFoundError) {
      return new NotFoundException(error.message);
    }
    if (error instanceof UserEmailAlreadyExistsError) {
      return new ConflictException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
