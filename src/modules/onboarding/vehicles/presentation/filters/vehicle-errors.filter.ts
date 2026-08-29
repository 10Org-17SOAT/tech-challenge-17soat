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
  DuplicateLicensePlateException,
  VehicleException,
  VehicleNotFoundException,
} from '@/modules/onboarding/vehicles/domain/exceptions/vehicle.exceptions';

@Catch(VehicleException)
export class VehicleErrorsFilter implements ExceptionFilter {
  catch(error: VehicleException, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    const httpError = this.toHttpException(error);
    response.status(httpError.getStatus()).json(httpError.getResponse());
  }

  private toHttpException(error: VehicleException) {
    if (error instanceof VehicleNotFoundException) {
      return new NotFoundException(error.message);
    }
    if (error instanceof DuplicateLicensePlateException) {
      return new ConflictException(error.message);
    }
    return new BadRequestException(error.message);
  }
}
