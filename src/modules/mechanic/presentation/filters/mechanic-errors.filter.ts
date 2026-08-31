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
  AllocatedMechanicException,
  DuplicateCpfException,
  InvalidCpfException,
  InvalidEmailException,
  InvalidMechanicException,
  InvalidPhoneException,
  MechanicNotAllocatedException,
  WrongServiceOrderException,
} from '../../domain/exceptions/mechanic.exceptions';
import {
  MechanicNotFoundException,
  NoAvailableMechanicException,
} from '../../application/exceptions/mechanic-application.exception';

@Catch(
  MechanicNotFoundException,
  NoAvailableMechanicException,
  DuplicateCpfException,
  AllocatedMechanicException,
  MechanicNotAllocatedException,
  WrongServiceOrderException,
  InvalidMechanicException,
  InvalidCpfException,
  InvalidEmailException,
  InvalidPhoneException,
)
export class MechanicErrorsFilter implements ExceptionFilter {
  catch(exception: Error, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpException = this.toHttpException(exception);
    response
      .status(httpException.getStatus())
      .json(httpException.getResponse());
  }

  private toHttpException(exception: Error) {
    if (
      exception instanceof MechanicNotFoundException ||
      exception instanceof NoAvailableMechanicException
    ) {
      return new NotFoundException(exception.message);
    }
    if (
      exception instanceof DuplicateCpfException ||
      exception instanceof AllocatedMechanicException ||
      exception instanceof MechanicNotAllocatedException ||
      exception instanceof WrongServiceOrderException
    ) {
      return new ConflictException(exception.message);
    }

    return new BadRequestException(exception.message);
  }
}
