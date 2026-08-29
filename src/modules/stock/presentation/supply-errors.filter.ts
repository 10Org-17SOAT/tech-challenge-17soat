import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ExceedsReservedQuantityError } from '@/modules/stock/domain/errors/exceeds-reserved-quantity.error';
import { InsufficientStockError } from '@/modules/stock/domain/errors/insufficient-stock.error';
import { InvalidStockMovementError } from '@/modules/stock/domain/errors/invalid-stock-movement.error';
import { InvalidSupplyError } from '@/modules/stock/domain/errors/invalid-supply.error';
import { ReservationNotFoundError } from '@/modules/stock/domain/errors/reservation-not-found.error';
import { SupplyNameAlreadyExistsError } from '@/modules/stock/domain/errors/supply-name-already-exists.error';
import { SupplyNotFoundError } from '@/modules/stock/domain/errors/supply-not-found.error';

@Catch(
  SupplyNotFoundError,
  SupplyNameAlreadyExistsError,
  InvalidSupplyError,
  InvalidStockMovementError,
  InsufficientStockError,
  ReservationNotFoundError,
  ExceedsReservedQuantityError,
)
export class SupplyErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.toHttpException(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: Error) {
    if (
      error instanceof SupplyNotFoundError ||
      error instanceof ReservationNotFoundError
    ) {
      return new NotFoundException(error.message);
    }
    if (
      error instanceof SupplyNameAlreadyExistsError ||
      error instanceof InsufficientStockError ||
      error instanceof ExceedsReservedQuantityError
    ) {
      return new ConflictException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
