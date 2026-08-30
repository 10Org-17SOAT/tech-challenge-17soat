import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { Response } from 'express';
import { InvalidServiceOrderTransitionError } from '../../service-orders/domain/errors/invalid-service-order-transition.error';
import { ServiceOrderNotFoundError } from '../../service-orders/domain/errors/service-order-not-found.error';
import { ApprovalTokenExpiredError } from '../domain/errors/approval-token-expired.error';
import { ApprovalTokenNotIssuedError } from '../domain/errors/approval-token-not-issued.error';
import { InvalidApprovalTokenError } from '../domain/errors/invalid-approval-token.error';
import { QuotationAlreadyApprovedError } from '../domain/errors/quotation-already-approved.error';
import { QuotationNotFoundError } from '../domain/errors/quotation-not-found.error';
import {
  renderApprovalAlreadyDone,
  renderApprovalExpired,
  renderApprovalInvalid,
  renderApprovalUnavailable,
} from './approval-result.template';

/**
 * The HTML counterpart of QuotationErrorsFilter, for the one route a customer
 * opens in a browser. Same domain errors, same status codes — a different body,
 * because a JSON error page is unreadable to the person it is addressed to.
 *
 * The status codes still mean what they mean: 404 unknown link, 410 expired,
 * 409 nothing left to approve.
 */
@Catch(
  InvalidApprovalTokenError,
  ApprovalTokenExpiredError,
  ApprovalTokenNotIssuedError,
  QuotationAlreadyApprovedError,
  QuotationNotFoundError,
  ServiceOrderNotFoundError,
  InvalidServiceOrderTransitionError,
)
export class ApprovalLinkErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const { status, html } = this.render(error);
    response
      .status(status)
      .setHeader('Content-Type', 'text/html; charset=utf-8');
    response.send(html);
  }

  private render(error: Error): { status: number; html: string } {
    if (error instanceof ApprovalTokenExpiredError) {
      return {
        status: HttpStatus.GONE,
        html: renderApprovalExpired(error.expiredAt),
      };
    }
    if (error instanceof QuotationAlreadyApprovedError) {
      // Not a failure from the customer's side: they clicked twice, or the
      // attendant had already registered the approval by phone.
      return {
        status: HttpStatus.CONFLICT,
        html: renderApprovalAlreadyDone(null),
      };
    }
    if (error instanceof InvalidServiceOrderTransitionError) {
      return {
        status: HttpStatus.CONFLICT,
        html: renderApprovalUnavailable(),
      };
    }
    // Unknown token, a quotation that was never emailed, a vanished order: all
    // answer the same way. A wrong link learns nothing about what exists.
    return { status: HttpStatus.NOT_FOUND, html: renderApprovalInvalid() };
  }
}
