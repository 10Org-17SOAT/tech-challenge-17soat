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
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { VehicleNotFoundError } from '../../service-orders/domain/errors/vehicle-not-found.error';
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
  VehicleNotFoundError,
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
      error instanceof ServiceOrderNotFoundError
    ) {
      return new NotFoundException(error.message);
    }
    if (
      error instanceof AnamnesisLockedException ||
      error instanceof AnamnesisAlreadyExistsException
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