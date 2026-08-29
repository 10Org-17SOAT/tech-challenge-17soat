import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidServiceError } from '../domain/errors/invalid-service.error';
import { ServiceNameAlreadyExistsError } from '../domain/errors/service-name-already-exists.error';
import { ServiceNotFoundError } from '../domain/errors/service-not-found.error';

@Catch(ServiceNotFoundError, ServiceNameAlreadyExistsError, InvalidServiceError)
export class ServiceErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.toHttpException(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: Error) {
    if (error instanceof ServiceNotFoundError) {
      return new NotFoundException(error.message);
    }
    if (error instanceof ServiceNameAlreadyExistsError) {
      return new ConflictException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
