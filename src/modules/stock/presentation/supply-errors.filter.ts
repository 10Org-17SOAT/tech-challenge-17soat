import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ExceedsReservedQuantityError } from '../domain/errors/exceeds-reserved-quantity.error';
import { InsufficientStockError } from '../domain/errors/insufficient-stock.error';
import { InvalidStockMovementError } from '../domain/errors/invalid-stock-movement.error';
import { InvalidSupplyError } from '../domain/errors/invalid-supply.error';
import { ReservationNotFoundError } from '../domain/errors/reservation-not-found.error';
import { StockKeeperCpfAlreadyExistsError } from '../domain/errors/stock-keeper-cpf-already-exists.error';
import { StockKeeperNotFoundError } from '../domain/errors/stock-keeper-not-found.error';
import { InvalidStockKeeperError } from '../domain/errors/invalid-stock-keeper.error';
import { SupplyNameAlreadyExistsError } from '../domain/errors/supply-name-already-exists.error';
import { SupplyNotFoundError } from '../domain/errors/supply-not-found.error';

@Catch(
  SupplyNotFoundError,
  SupplyNameAlreadyExistsError,
  InvalidSupplyError,
  InvalidStockMovementError,
  InsufficientStockError,
  ReservationNotFoundError,
  ExceedsReservedQuantityError,
  StockKeeperNotFoundError,
  StockKeeperCpfAlreadyExistsError,
  InvalidStockKeeperError,
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
      error instanceof ReservationNotFoundError ||
      error instanceof StockKeeperNotFoundError
    ) {
      return new NotFoundException(error.message);
    }
    if (
      error instanceof SupplyNameAlreadyExistsError ||
      error instanceof InsufficientStockError ||
      error instanceof ExceedsReservedQuantityError ||
      error instanceof StockKeeperCpfAlreadyExistsError
    ) {
      return new ConflictException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
