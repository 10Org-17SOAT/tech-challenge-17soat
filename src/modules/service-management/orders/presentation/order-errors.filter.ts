import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidOrderError } from '../domain/errors/invalid-order.error';
import { InvalidOrderTransitionError } from '../domain/errors/invalid-order-transition.error';
import { OrderNotDeletableError } from '../domain/errors/order-not-deletable.error';
import { OrderNotFoundError } from '../domain/errors/order-not-found.error';

@Catch(
  OrderNotFoundError,
  InvalidOrderError,
  InvalidOrderTransitionError,
  OrderNotDeletableError,
)
export class OrderErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.toHttpException(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: Error) {
    if (error instanceof OrderNotFoundError) {
      return new NotFoundException(error.message);
    }
    if (
      error instanceof InvalidOrderTransitionError ||
      error instanceof OrderNotDeletableError
    ) {
      return new ConflictException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
