import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  NotFoundException,
} from '@nestjs/common';
import { Response } from 'express';
import { ConsultantCpfAlreadyExistsError } from '../domain/errors/consultant-cpf-already-exists.error';
import { ConsultantNotFoundError } from '../domain/errors/consultant-not-found.error';
import { InvalidConsultantError } from '../domain/errors/invalid-consultant.error';

@Catch(
  ConsultantNotFoundError,
  ConsultantCpfAlreadyExistsError,
  InvalidConsultantError,
)
export class ConsultantErrorsFilter implements ExceptionFilter {
  catch(error: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.toHttpException(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: Error) {
    if (error instanceof ConsultantNotFoundError) {
      return new NotFoundException(error.message);
    }
    if (error instanceof ConsultantCpfAlreadyExistsError) {
      return new ConflictException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
