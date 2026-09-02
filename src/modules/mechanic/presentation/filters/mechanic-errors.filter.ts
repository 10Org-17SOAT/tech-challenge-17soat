import {
  ArgumentsHost,
  BadRequestException,
  Catch,
  ConflictException,
  ExceptionFilter,
  ForbiddenException,
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
  MechanicIdentityMismatchException,
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
  MechanicIdentityMismatchException,
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
    // The role was right and the identity was not, which is a 403 — never a
    // 404, because the mechanic plainly exists.
    if (exception instanceof MechanicIdentityMismatchException) {
      return new ForbiddenException(exception.message);
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
