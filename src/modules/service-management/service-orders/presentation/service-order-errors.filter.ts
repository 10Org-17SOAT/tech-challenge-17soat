import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidServiceOrderError } from '../domain/errors/invalid-service-order.error';
import { InvalidServiceOrderTransitionError } from '../domain/errors/invalid-service-order-transition.error';
import { ServiceOrderNotDeletableError } from '../domain/errors/service-order-not-deletable.error';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';

@Catch(
  ServiceOrderNotFoundError,
  InvalidServiceOrderError,
  InvalidServiceOrderTransitionError,
  ServiceOrderNotDeletableError,
)
export class ServiceOrderErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.toHttpException(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: Error) {
    if (error instanceof ServiceOrderNotFoundError) {
      return new NotFoundException(error.message);
    }
    if (
      error instanceof InvalidServiceOrderTransitionError ||
      error instanceof ServiceOrderNotDeletableError
    ) {
      return new ConflictException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
