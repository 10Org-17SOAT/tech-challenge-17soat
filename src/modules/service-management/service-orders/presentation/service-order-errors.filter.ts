import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidServiceOrderError } from '../domain/errors/invalid-service-order.error';
import { InvalidServiceOrderTransitionError } from '../domain/errors/invalid-service-order-transition.error';
import { ServiceOrderNotDeletableError } from '../domain/errors/service-order-not-deletable.error';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { VehicleNotFoundForServiceOrderError } from '../domain/errors/vehicle-not-found-for-service-order.error';
import { VehicleNotFoundError } from '../domain/errors/vehicle-not-found.error';

@Catch(
  ServiceOrderNotFoundError,
  InvalidServiceOrderError,
  InvalidServiceOrderTransitionError,
  ServiceOrderNotDeletableError,
  InvalidServiceOrderError,
  InvalidServiceOrderTransitionError,
  ServiceOrderNotDeletableError,
  VehicleNotFoundForServiceOrderError,
  VehicleNotFoundError,
)
export class ServiceOrderErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.toHttpException(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: Error) {
    if (
      error instanceof ServiceOrderNotFoundError ||
      error instanceof VehicleNotFoundForServiceOrderError
    ) {
      return new NotFoundException(error.message);
    }
    if (
      error instanceof InvalidServiceOrderTransitionError ||
      error instanceof ServiceOrderNotDeletableError
    ) {
      return new ConflictException(error.message);
    }
    // The request is well-formed, but the referenced vehicle does not exist.
    if (error instanceof VehicleNotFoundError) {
      return new UnprocessableEntityException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
