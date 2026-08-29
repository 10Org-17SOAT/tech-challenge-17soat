import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import {
  DuplicateDocumentException,
  InvalidAddressException,
  InvalidCustomerException,
  InvalidDocumentException,
  InvalidEmailException,
  InvalidPhoneException,
} from '@/modules/onboarding/customer/domain/exceptions/customer.exceptions';
import { CustomerNotFoundException } from '@/modules/onboarding/customer/application/exceptions/customer-application.exception';

@Catch(
  CustomerNotFoundException,
  DuplicateDocumentException,
  InvalidCustomerException,
  InvalidDocumentException,
  InvalidEmailException,
  InvalidPhoneException,
  InvalidAddressException,
)
export class CustomerErrorsFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.toHttpException(exception);
    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private toHttpException(exception: Error) {
    if (exception instanceof CustomerNotFoundException) {
      return new NotFoundException(exception.message);
    }
    if (exception instanceof DuplicateDocumentException) {
      return new ConflictException(exception.message);
    }

    return new BadRequestException(exception.message);
  }
}
