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
import { AnamnesisRequiredException } from '../../anamnesis/domain/exceptions/anamnesis.exceptions';
import { InvalidServiceOrderTransitionError } from '../../service-orders/domain/errors/invalid-service-order-transition.error';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { InvalidQuotationError } from '../domain/errors/invalid-quotation.error';
import { PartUnavailableForQuotationError } from '../domain/errors/part-unavailable-for-quotation.error';
import { QuotationAlreadyApprovedError } from '../domain/errors/quotation-already-approved.error';
import { QuotationNotFoundError } from '../domain/errors/quotation-not-found.error';
import { RecipientUnreachableError } from '../domain/errors/recipient-unreachable.error';
import { ServiceUnavailableForQuotationError } from '../domain/errors/service-unavailable-for-quotation.error';

@Catch(
  QuotationNotFoundError,
  QuotationAlreadyApprovedError,
  InvalidQuotationError,
  PartUnavailableForQuotationError,
  ServiceUnavailableForQuotationError,
  ServiceOrderNotFoundError,
  InvalidServiceOrderTransitionError,
  RecipientUnreachableError,
  AnamnesisRequiredException,
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
      error instanceof InvalidServiceOrderTransitionError ||
      error instanceof AnamnesisRequiredException
    ) {
      return new ConflictException(error.message);
    }
    // The catalogue moved under a scope of work that was already agreed, or
    // there is nobody left to email it to: the request is well-formed, the
    // data behind it is not.
    if (
      error instanceof PartUnavailableForQuotationError ||
      error instanceof ServiceUnavailableForQuotationError ||
      error instanceof RecipientUnreachableError
    ) {
      return new UnprocessableEntityException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
