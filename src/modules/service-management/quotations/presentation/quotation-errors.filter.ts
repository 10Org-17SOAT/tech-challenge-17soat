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
import { InvalidServiceOrderTransitionError } from '../../service-orders/domain/errors/invalid-service-order-transition.error';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { InvalidQuotationError } from '../domain/errors/invalid-quotation.error';
import { PartUnavailableForQuotationError } from '../domain/errors/part-unavailable-for-quotation.error';
import { QuotationAlreadyApprovedError } from '../domain/errors/quotation-already-approved.error';
import { QuotationNotFoundError } from '../domain/errors/quotation-not-found.error';
import { ServiceUnavailableForQuotationError } from '../domain/errors/service-unavailable-for-quotation.error';

@Catch(
  QuotationNotFoundError,
  QuotationAlreadyApprovedError,
  InvalidQuotationError,
  PartUnavailableForQuotationError,
  ServiceUnavailableForQuotationError,
  ServiceOrderNotFoundError,
  InvalidServiceOrderTransitionError,
)
export class QuotationErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.toHttpException(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: Error) {
    if (
      error instanceof QuotationNotFoundError ||
      error instanceof ServiceOrderNotFoundError
    ) {
      return new NotFoundException(error.message);
    }
    if (
      error instanceof QuotationAlreadyApprovedError ||
      error instanceof InvalidServiceOrderTransitionError
    ) {
      return new ConflictException(error.message);
    }
    // The catalogue moved under a scope of work that was already agreed: the
    // request is well-formed, the data behind it is not.
    if (
      error instanceof PartUnavailableForQuotationError ||
      error instanceof ServiceUnavailableForQuotationError
    ) {
      return new UnprocessableEntityException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
