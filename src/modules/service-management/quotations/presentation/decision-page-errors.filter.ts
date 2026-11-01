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
import { InvalidQuotationError } from '../domain/errors/invalid-quotation.error';
import { QuotationAlreadyApprovedError } from '../domain/errors/quotation-already-approved.error';
import { QuotationAlreadyRejectedError } from '../domain/errors/quotation-already-rejected.error';
import { QuotationNotFoundError } from '../domain/errors/quotation-not-found.error';
import {
  renderAlreadyApproved,
  renderAlreadyRejected,
  renderDecisionExpired,
  renderDecisionLinkInvalid,
  renderDecisionRefused,
  renderDecisionUnavailable,
} from './decision-page.template';

/**
 * The HTML counterpart of QuotationErrorsFilter, for the routes a customer
 * opens in a browser. Same domain errors — a different body, because a JSON
 * error page is unreadable to the person it is addressed to.
 *
 * The status codes still mean what they mean: 404 unknown link, 410 expired,
 * 409 nothing left to decide, 400 a form that does not hold up.
 */
@Catch(
  InvalidApprovalTokenError,
  ApprovalTokenExpiredError,
  ApprovalTokenNotIssuedError,
  QuotationAlreadyApprovedError,
  QuotationAlreadyRejectedError,
  QuotationNotFoundError,
  InvalidQuotationError,
  ServiceOrderNotFoundError,
  InvalidServiceOrderTransitionError,
)
export class DecisionPageErrorsFilter implements ExceptionFilter {
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
        html: renderDecisionExpired(error.expiredAt),
      };
    }
    // Only reached by the opposite answer: repeating the same one is answered
    // with its result page, not an error.
    if (error instanceof QuotationAlreadyApprovedError) {
      return { status: HttpStatus.CONFLICT, html: renderAlreadyApproved() };
    }
    if (error instanceof QuotationAlreadyRejectedError) {
      return { status: HttpStatus.CONFLICT, html: renderAlreadyRejected() };
    }
    if (error instanceof InvalidServiceOrderTransitionError) {
      return {
        status: HttpStatus.CONFLICT,
        html: renderDecisionUnavailable(),
      };
    }
    if (error instanceof InvalidQuotationError) {
      return { status: HttpStatus.BAD_REQUEST, html: renderDecisionRefused() };
    }
    // Unknown token, a quotation that was never emailed, a vanished order: all
    // answer the same way. A wrong link learns nothing about what exists.
    return { status: HttpStatus.NOT_FOUND, html: renderDecisionLinkInvalid() };
  }
}
