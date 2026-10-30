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
import { ConsultantNotFoundForServiceOrderError } from '../domain/errors/consultant-not-found-for-service-order.error';
import { InvalidServiceOrderError } from '../domain/errors/invalid-service-order.error';
import { InvalidServiceOrderTransitionError } from '../domain/errors/invalid-service-order-transition.error';
import { PartsNotFoundForServiceOrderError } from '../domain/errors/parts-not-found-for-service-order.error';
import { ServiceOrderNotDeletableError } from '../domain/errors/service-order-not-deletable.error';
import { ServiceOrderNotFoundError } from '../domain/errors/service-order-not-found.error';
import { ServicesNotFoundForServiceOrderError } from '../domain/errors/services-not-found-for-service-order.error';
import { VehicleNotFoundForServiceOrderError } from '../domain/errors/vehicle-not-found-for-service-order.error';

@Catch(
  ServiceOrderNotFoundError,
  InvalidServiceOrderError,
  InvalidServiceOrderTransitionError,
  ServiceOrderNotDeletableError,
  VehicleNotFoundForServiceOrderError,
  ConsultantNotFoundForServiceOrderError,
  ServicesNotFoundForServiceOrderError,
  PartsNotFoundForServiceOrderError,
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
    // Something the payload points at does not exist: the
    // request is well-formed, so 422 rather than 400, and the route itself
    // was found, so not 404.
    if (
      error instanceof VehicleNotFoundForServiceOrderError ||
      error instanceof ConsultantNotFoundForServiceOrderError ||
      error instanceof ServicesNotFoundForServiceOrderError ||
      error instanceof PartsNotFoundForServiceOrderError
    ) {
      return new UnprocessableEntityException(error.message);
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
