import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { InsufficientStockError } from '../domain/errors/insufficient-stock.error';
import { InvalidStockMovementError } from '../domain/errors/invalid-stock-movement.error';
import { InvalidSupplyError } from '../domain/errors/invalid-supply.error';
import { SupplyNameAlreadyExistsError } from '../domain/errors/supply-name-already-exists.error';
import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';

@Catch(
  SupplyNotFoundError,
  SupplyNameAlreadyExistsError,
  InvalidSupplyError,
  InvalidStockMovementError,
  InsufficientStockError,
)
export class SupplyErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.toHttpException(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: Error) {
    if (error instanceof SupplyNotFoundError) {
      return new NotFoundException(error.message);
    }
    if (
      error instanceof SupplyNameAlreadyExistsError ||
      error instanceof InsufficientStockError
    ) {
      return new ConflictException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
