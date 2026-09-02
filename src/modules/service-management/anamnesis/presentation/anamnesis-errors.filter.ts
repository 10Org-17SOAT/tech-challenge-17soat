import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { VehicleNotFoundForServiceOrderError } from '../../service-orders/domain/errors/vehicle-not-found-for-service-order.error';
import {
  AnamnesisAlreadyExistsException,
  AnamnesisLockedException,
  AnamnesisNotFoundException,
  InvalidAnamnesisException,
} from '../domain/exceptions/anamnesis.exceptions';

@Catch(
  AnamnesisNotFoundException,
  AnamnesisLockedException,
  AnamnesisAlreadyExistsException,
  InvalidAnamnesisException,
  ServiceOrderNotFoundError,
  VehicleNotFoundForServiceOrderError,
)
export class AnamnesisErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.toHttpException(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: Error) {
    if (
      error instanceof AnamnesisNotFoundException ||
      error instanceof ServiceOrderNotFoundError ||
      error instanceof VehicleNotFoundForServiceOrderError
    ) {
      return new NotFoundException(error.message);
    }
    if (
      error instanceof AnamnesisLockedException ||
      error instanceof AnamnesisAlreadyExistsException
    ) {
      return new ConflictException(error.message);
    }
    return new BadRequestException(error.message);
  }
}