import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidStockKeeperError } from '../domain/errors/invalid-stock-keeper.error';
import { StockKeeperCpfAlreadyExistsError } from '../domain/errors/stock-keeper-cpf-already-exists.error';
import { StockKeeperNotFoundError } from '../domain/errors/stock-keeper-not-found.error';

@Catch(
  StockKeeperNotFoundError,
  StockKeeperCpfAlreadyExistsError,
  InvalidStockKeeperError,
)
export class StockKeeperErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.toHttpException(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: Error) {
    if (error instanceof StockKeeperNotFoundError) {
      return new NotFoundException(error.message);
    }
    if (error instanceof StockKeeperCpfAlreadyExistsError) {
      return new ConflictException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
