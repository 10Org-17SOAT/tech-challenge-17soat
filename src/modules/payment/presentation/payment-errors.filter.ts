import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidPaymentError } from '../domain/errors/invalid-payment.error';
import { PaymentNotFoundError } from '../domain/errors/payment-not-found.error';
import { ServiceOrderAlreadyPaidError } from '../domain/errors/service-order-already-paid.error';
import { ServiceOrderNotFoundForPaymentError } from '../domain/errors/service-order-not-found-for-payment.error';
import { ServiceOrderNotPayableError } from '../domain/errors/service-order-not-payable.error';

@Catch(
  PaymentNotFoundError,
  ServiceOrderNotFoundForPaymentError,
  ServiceOrderNotPayableError,
  ServiceOrderAlreadyPaidError,
  InvalidPaymentError,
)
export class PaymentErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.toHttpException(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: Error) {
    if (
      error instanceof PaymentNotFoundError ||
      error instanceof ServiceOrderNotFoundForPaymentError
    ) {
      return new NotFoundException(error.message);
    }
    if (
      error instanceof ServiceOrderNotPayableError ||
      error instanceof ServiceOrderAlreadyPaidError
    ) {
      return new ConflictException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
