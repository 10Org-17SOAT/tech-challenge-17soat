/// <reference types="jest" />

import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { Vehicle } from './domain/entities/vehicle.entity';
import {
  VehicleId,
  LicensePlate,
  VehicleModel,
  VehicleColor,
  FuelType,
  Odometer,
  VehicleStatus,
  VehicleStatusEnum,
} from './domain/value-objects';
import {
  DuplicateLicensePlateException,
  InvalidFuelTypeException,
  InvalidLicensePlateException,
  InvalidOdometerException,
  InvalidVehicleModelException,
  InvalidVehicleStatusException,
  VehicleException,
  VehicleNotFoundException,
} from './domain/exceptions/vehicle.exceptions';
import { CreateVehicleUseCase } from './application/use-cases/create-vehicle/create-vehicle.use-case';
import { FindVehicleByIdUseCase } from './application/use-cases/find-vehicle-by-id/find-vehicle-by-id.use-case';
import { ListVehiclesUseCase } from './application/use-cases/list-vehicles/list-vehicles.use-case';
import { UpdateVehicleUseCase } from './application/use-cases/update-vehicle/update-vehicle.use-case';
import { DeleteVehicleUseCase } from './application/use-cases/delete-vehicle/delete-vehicle.use-case';
import { VehicleMapper } from './infrastructure/mappers/vehicle.mapper';
import { VehicleResponseDto } from './application/dtos/vehicle-response.dto';
import type { IVehicleRepository } from './domain/repositories/vehicle.repository';
import { VehicleController } from './presentation/controllers/vehicle.controller';
import { ListVehiclesQueryDto } from './presentation/controllers/vehicle.dto';
import { VehicleManagementModule } from './vehicle-management.module';
import { DrizzleVehicleRepository } from './infrastructure/repositories/drizzle-vehicle.repository';
import { vehiclesTable } from './infrastructure/persistence/vehicle.schema';

describe('Vehicle Management module', () => {
  const vehicleFactory = (overrides: Partial<any> = {}) =>
    Vehicle.create({
      id: '123e4567-e89b-12d3-a456-426614174000',
      licensePlate: 'ABC-1234',
      model: 'Civic',
      year: 2024,
      manufacturer: 'Honda',
      description: 'Carro usado',
      color: 'Prata',
      fuelType: 'HYBRID',
      odometer: 15000,
      status: 'ACTIVE',
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      ...overrides,
    });

  describe('Vehicle entity', () => {
    it('should create a valid vehicle with default values and accessors', () => {
      const vehicle = vehicleFactory();

      expect(vehicle).toBeInstanceOf(Vehicle);
      expect(vehicle.getId()).toBeInstanceOf(VehicleId);
      expect(vehicle.getLicensePlate()).toBeInstanceOf(LicensePlate);
      expect(vehicle.getVehicleModel()).toBeInstanceOf(VehicleModel);
      expect(vehicle.getColor()).toBeInstanceOf(VehicleColor);
      expect(vehicle.getFuelType()).toBeInstanceOf(FuelType);
      expect(vehicle.getOdometer()).toBeInstanceOf(Odometer);
      expect(vehicle.getStatus()).toBeInstanceOf(VehicleStatus);
      expect(vehicle.getCreatedAt()).toBeInstanceOf(Date);
      expect(vehicle.getUpdatedAt()).toBeInstanceOf(Date);
      expect(vehicle.getStatus().getValue()).toBe(VehicleStatusEnum.ACTIVE);
      expect(vehicle.toPrimitives()).toMatchObject({
        id: '123e4567-e89b-12d3-a456-426614174000',
        licensePlate: 'ABC-1234',
        model: 'Civic',
        year: 2024,
        manufacturer: 'Honda',
        description: 'Carro usado',
        color: 'Prata',
        fuelType: 'HYBRID',
        odometer: 15000,
        status: 'ACTIVE',
      });
    });

    it('should update the status and mark updatedAt', () => {
      const vehicle = vehicleFactory();
      const before = vehicle.getUpdatedAt();

      vehicle.updateStatus('MAINTENANCE');

      expect(vehicle.getStatus().getValue()).toBe(
        VehicleStatusEnum.MAINTENANCE,
      );
      expect(vehicle.getUpdatedAt().getTime()).toBeGreaterThan(
        before.getTime(),
      );
    });

    it('should cover invalid status path in updateStatus and updateVehicleInfo catch blocks', () => {
      const vehicle = vehicleFactory();

      expect(() => vehicle.updateStatus('INVALID' as any)).toThrow(
        InvalidVehicleStatusException,
      );
      expect(() =>
        vehicle.updateVehicleInfo({
          color: '   ',
        }),
      ).toThrow(VehicleException);
    });

    it('should activate, deactivate and send to maintenance', () => {
      const vehicle = vehicleFactory({ status: 'INACTIVE' });

      vehicle.activate();
      expect(vehicle.getStatus().getValue()).toBe(VehicleStatusEnum.ACTIVE);

      vehicle.updateStatus('INACTIVE');
      expect(vehicle.getStatus().getValue()).toBe(VehicleStatusEnum.INACTIVE);

      vehicle.sendToMaintenance();
      expect(vehicle.getStatus().getValue()).toBe(
        VehicleStatusEnum.MAINTENANCE,
      );
    });

    it('should update vehicle data and throw on invalid status', () => {
      const vehicle = vehicleFactory();
      vehicle.updateVehicleInfo({
        model: 'Corolla',
        manufacturer: 'Toyota',
        year: 2023,
        description: 'Novo',
        color: 'Preto',
        fuelType: 'DIESEL',
        odometer: 2000,
        status: 'INACTIVE',
      });

      const primitives = vehicle.toPrimitives();
      expect(primitives.model).toBe('Corolla');
      expect(primitives.manufacturer).toBe('Toyota');
      expect(primitives.year).toBe(2023);
      expect(primitives.description).toBe('Novo');
      expect(primitives.color).toBe('Preto');
      expect(primitives.fuelType).toBe('DIESEL');
      expect(primitives.odometer).toBe(2000);
      expect(primitives.status).toBe('INACTIVE');

      expect(() =>
        vehicle.updateVehicleInfo({
          status: 'INVALID' as any,
        }),
      ).toThrow(VehicleException);
    });

    it('should increment odometer and throw for negative values', () => {
      const vehicle = vehicleFactory({ odometer: 1000 });

      vehicle.incrementOdometer(250);
      expect(vehicle.getOdometer().getValue()).toBe(1250);

      expect(() => vehicle.incrementOdometer(-1)).toThrow(VehicleException);
    });

    it('should expose equality and primitive shape', () => {
      const first = vehicleFactory();
      const second = vehicleFactory();
      const other = vehicleFactory({
        id: '11111111-1111-4111-8111-111111111111',
      });

      expect(first.equals(second)).toBe(true);
      expect(first.equals(other)).toBe(false);
      expect(first.toPrimitives().createdAt).toBeInstanceOf(Date);
      expect(first.toPrimitives().updatedAt).toBeInstanceOf(Date);
    });
  });

  describe('Value objects', () => {
    it('should validate license plate formats and equality helpers', () => {
      const plateA = new LicensePlate('ABC-1234');
      const plateB = new LicensePlate('ABC-1234');
      const plateC = new LicensePlate('XYZ-9876');

      expect(() => new LicensePlate('ABC-1234')).not.toThrow();
      expect(() => new LicensePlate('ABC1D23')).not.toThrow();
      expect(() => new LicensePlate('')).toThrow(
        'License plate cannot be empty',
      );
      expect(() => new LicensePlate('AB-123')).toThrow(
        'Invalid Brazilian license plate format',
      );
      expect(plateA.equals(plateB)).toBe(true);
      expect(plateA.equals(plateC)).toBe(false);
      expect(plateA.toString()).toBe('ABC-1234');
    });

    it('should validate vehicle id format', () => {
      expect(
        () => new VehicleId('123e4567-e89b-12d3-a456-426614174000'),
      ).not.toThrow();
      expect(() => new VehicleId('invalid')).toThrow(
        'VehicleId must be a valid UUID',
      );
    });

    it('should validate vehicle model and year', () => {
      const modelA = new VehicleModel('Civic', 'Honda', 2024);
      const modelB = new VehicleModel('Civic', 'Honda', 2024);
      const modelC = new VehicleModel('Corolla', 'Toyota', 2023);

      expect(() => new VehicleModel('Civic', 'Honda', 2024)).not.toThrow();
      expect(() => new VehicleModel('', 'Honda', 2024)).toThrow(
        'Model cannot be empty',
      );
      expect(() => new VehicleModel('Civic', '', 2024)).toThrow(
        'Manufacturer cannot be empty',
      );
      expect(() => new VehicleModel('Civic', 'Honda', 1800)).toThrow(
        'Year must be between',
      );
      expect(modelA.equals(modelB)).toBe(true);
      expect(modelA.equals(modelC)).toBe(false);
      expect(modelA.toString()).toContain('Honda');
    });

    it('should validate color and fuel type', () => {
      expect(() => new VehicleColor('Prata')).not.toThrow();
      expect(() => new VehicleColor('')).toThrow('Color cannot be empty');
      expect(() => new FuelType('GASOLINE')).not.toThrow();
      expect(() => new FuelType('UNKNOWN' as any)).toThrow(
        'Invalid fuel type. Must be one of',
      );
    });

    it('should validate odometer and status', () => {
      const odometerA = new Odometer(5000);
      const odometerB = new Odometer(5000);
      const odometerC = new Odometer(6000);
      const statusA = new VehicleStatus('ACTIVE');
      const statusB = new VehicleStatus('ACTIVE');
      const statusC = new VehicleStatus('INACTIVE');

      expect(() => new Odometer(5000)).not.toThrow();
      expect(() => new Odometer(-1)).toThrow('Odometer cannot be negative');
      expect(() => new Odometer(10.5 as any)).toThrow(
        'Odometer must be an integer number',
      );
      expect(() => new VehicleStatus('ACTIVE')).not.toThrow();
      expect(() => new VehicleStatus('UNKNOWN' as any)).toThrow(
        'Invalid vehicle status. Must be one of',
      );
      expect(odometerA.equals(odometerB)).toBe(true);
      expect(odometerA.equals(odometerC)).toBe(false);
      expect(statusA.equals(statusB)).toBe(true);
      expect(statusA.equals(statusC)).toBe(false);
      expect(odometerA.toString()).toContain('5000');
      expect(statusA.toString()).toBe('ACTIVE');
    });
  });

  describe('Vehicle exceptions', () => {
    it('should expose the correct exception messages', () => {
      expect(new InvalidLicensePlateException('AB-123').message).toContain(
        'Invalid license plate',
      );
      expect(new DuplicateLicensePlateException('ABC-1234').message).toContain(
        'already exists',
      );
      expect(new VehicleNotFoundException('id-1').message).toContain('id-1');
      expect(new VehicleNotFoundException().message).toContain(
        'Vehicle was not found',
      );
      expect(new InvalidVehicleStatusException('INVALID').message).toContain(
        'INVALID',
      );
      expect(new InvalidFuelTypeException('UNKNOWN').message).toContain(
        'UNKNOWN',
      );
      expect(new InvalidOdometerException(-1).message).toContain('-1');
      expect(new InvalidVehicleModelException('bad model').message).toContain(
        'bad model',
      );
    });
  });

  describe('CreateVehicleUseCase', () => {
    it('should create a vehicle when plate is free', async () => {
      const repository: jest.Mocked<Partial<IVehicleRepository>> = {
        findByLicensePlate: jest.fn().mockResolvedValue(null),
        save: jest.fn().mockResolvedValue(undefined),
      };

      const useCase = new CreateVehicleUseCase(
        repository as any as IVehicleRepository,
      );
      const result = await useCase.execute({
        licensePlate: 'ABC-1234',
        model: 'Civic',
        year: 2024,
        manufacturer: 'Honda',
        description: 'Carro usado',
        color: 'Prata',
        fuelType: 'HYBRID',
        odometer: 15000,
      });

      expect(result.licensePlate).toBe('ABC-1234');
      expect(result.status).toBe('ACTIVE');
      expect(repository.findByLicensePlate).toHaveBeenCalledTimes(1);
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('should reject when license plate already exists', async () => {
      const repository: jest.Mocked<Partial<IVehicleRepository>> = {
        findByLicensePlate: jest.fn().mockResolvedValue(vehicleFactory()),
      };

      const useCase = new CreateVehicleUseCase(
        repository as any as IVehicleRepository,
      );

      await expect(
        useCase.execute({
          licensePlate: 'ABC-1234',
          model: 'Civic',
          year: 2024,
          manufacturer: 'Honda',
          color: 'Prata',
          fuelType: 'HYBRID',
          odometer: 15000,
        }),
      ).rejects.toBeInstanceOf(DuplicateLicensePlateException);
    });
  });

  describe('FindVehicleByIdUseCase', () => {
    it('should return the vehicle by id', async () => {
      const vehicle = vehicleFactory();
      const repository: jest.Mocked<Partial<IVehicleRepository>> = {
        findById: jest.fn().mockResolvedValue(vehicle),
      };

      const useCase = new FindVehicleByIdUseCase(repository as any);
      const result = await useCase.execute(vehicle.getId().getValue());

      expect(result).toBe(vehicle);
      expect(repository.findById).toHaveBeenCalledWith(expect.any(VehicleId));
    });

    it('should throw when id does not exist', async () => {
      const repository: jest.Mocked<Partial<IVehicleRepository>> = {
        findById: jest.fn().mockResolvedValue(null),
      };

      const useCase = new FindVehicleByIdUseCase(repository as any);

      await expect(
        useCase.execute('123e4567-e89b-12d3-a456-426614174999'),
      ).rejects.toBeInstanceOf(VehicleNotFoundException);
    });
  });

  describe('ListVehiclesUseCase', () => {
    it('should list vehicles with pagination and clamp values', async () => {
      const vehicles = [
        vehicleFactory(),
        vehicleFactory({
          id: '22222222-2222-4222-8222-222222222222',
          licensePlate: 'DEF-5678',
        }),
      ];

      const repository: jest.Mocked<Partial<IVehicleRepository>> = {
        findAll: jest.fn().mockResolvedValue(vehicles),
        findAllCount: jest.fn().mockResolvedValue(2),
      };

      const useCase = new ListVehiclesUseCase(repository as any);
      const result = await useCase.execute({ page: 0, limit: 999 });

      expect(result.pagination.page).toBe(1);
      expect(result.pagination.limit).toBe(100);
      expect(result.pagination.total).toBe(2);
      expect(result.pagination.pages).toBe(1);
      expect(result.data).toHaveLength(2);
      expect(result.data[0].licensePlate).toBe('ABC-1234');
    });
  });

  describe('UpdateVehicleUseCase', () => {
    it('should update a vehicle when existing', async () => {
      const vehicle = vehicleFactory();
      const repository: jest.Mocked<Partial<IVehicleRepository>> = {
        findById: jest.fn().mockResolvedValue(vehicle),
        save: jest.fn().mockResolvedValue(undefined),
      };

      const useCase = new UpdateVehicleUseCase(repository as any);
      const result = await useCase.execute({
        id: vehicle.getId().getValue(),
        model: 'Fit',
        year: 2022,
        manufacturer: 'Honda',
        description: 'Atualizado',
        color: 'Azul',
        fuelType: 'GASOLINE',
        odometer: 18000,
        status: 'INACTIVE',
      });

      expect(result.model).toBe('Fit');
      expect(result.status).toBe('INACTIVE');
      expect(repository.save).toHaveBeenCalledTimes(1);
    });

    it('should reject when vehicle not found', async () => {
      const repository: jest.Mocked<Partial<IVehicleRepository>> = {
        findById: jest.fn().mockResolvedValue(null),
      };

      const useCase = new UpdateVehicleUseCase(repository as any);

      await expect(
        useCase.execute({
          id: '123e4567-e89b-12d3-a456-426614174999',
          model: 'Fit',
        }),
      ).rejects.toBeInstanceOf(VehicleNotFoundException);
    });
  });

  describe('DeleteVehicleUseCase', () => {
    it('should disable an existing vehicle', async () => {
      const vehicle = vehicleFactory({ status: 'ACTIVE' });
      const repository: jest.Mocked<Partial<IVehicleRepository>> = {
        findById: jest.fn().mockResolvedValue(vehicle),
        delete: jest.fn().mockResolvedValue(undefined),
      };

      const useCase = new DeleteVehicleUseCase(repository as any);
      await useCase.execute(vehicle.getId().getValue());

      expect(vehicle.getStatus().getValue()).toBe(VehicleStatusEnum.INACTIVE);
      expect(repository.delete).toHaveBeenCalledWith(vehicle);
    });

    it('should reject when vehicle is not found', async () => {
      const repository: jest.Mocked<Partial<IVehicleRepository>> = {
        findById: jest.fn().mockResolvedValue(null),
      };

      const useCase = new DeleteVehicleUseCase(repository as any);

      await expect(
        useCase.execute('123e4567-e89b-12d3-a456-426614174999'),
      ).rejects.toBeInstanceOf(VehicleNotFoundException);
    });
  });

  describe('Vehicle mapper and response dto', () => {
    it('should map a vehicle to persistence and back', () => {
      const vehicle = vehicleFactory();

      const persistence = VehicleMapper.toPersistence(vehicle);
      expect(persistence).toMatchObject({
        id: vehicle.getId().getValue(),
        licensePlate: 'ABC-1234',
        model: 'Civic',
      });

      const mapped = VehicleMapper.toDomain({
        ...persistence,
        createdAt: vehicle.getCreatedAt(),
        updatedAt: vehicle.getUpdatedAt(),
      });

      expect(mapped.equals(vehicle)).toBe(true);
    });

    it('should map the entity to response dto', () => {
      const vehicle = vehicleFactory();
      const dto = VehicleMapper.toResponse(vehicle);

      expect(dto).toBeInstanceOf(VehicleResponseDto);
      expect(dto.licensePlate).toBe('ABC-1234');
      expect(dto.status).toBe('ACTIVE');
    });
  });

  describe('VehicleController', () => {
    const createVehicleUseCase = { execute: jest.fn() };
    const findVehicleByIdUseCase = { execute: jest.fn() };
    const listVehiclesUseCase = { execute: jest.fn() };
    const updateVehicleUseCase = { execute: jest.fn() };
    const deleteVehicleUseCase = { execute: jest.fn() };

    const controller = new VehicleController(
      createVehicleUseCase as any,
      findVehicleByIdUseCase as any,
      listVehiclesUseCase as any,
      updateVehicleUseCase as any,
      deleteVehicleUseCase as any,
    );

    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should create a vehicle successfully', async () => {
      createVehicleUseCase.execute.mockResolvedValue({
        id: '11111111-1111-4111-8111-111111111111',
        licensePlate: 'ABC-1234',
        model: 'Civic',
        year: 2024,
        manufacturer: 'Honda',
        description: 'Carro usado',
        color: 'Prata',
        fuelType: 'HYBRID',
        odometer: 15000,
        status: 'ACTIVE',
      });

      const result = await controller.create({
        licensePlate: 'ABC-1234',
        model: 'Civic',
        year: 2024,
        manufacturer: 'Honda',
        description: 'Carro usado',
        color: 'Prata',
        fuelType: 'HYBRID',
        odometer: 15000,
      });

      expect(result).toBeInstanceOf(VehicleResponseDto);
      expect(result.licensePlate).toBe('ABC-1234');
    });

    it('should convert duplicate plate into ConflictException', async () => {
      createVehicleUseCase.execute.mockRejectedValue(
        new DuplicateLicensePlateException('ABC-1234'),
      );

      await expect(
        controller.create({
          licensePlate: 'ABC-1234',
          model: 'Civic',
          year: 2024,
          manufacturer: 'Honda',
          color: 'Prata',
          fuelType: 'HYBRID',
          odometer: 15000,
        }),
      ).rejects.toBeInstanceOf(ConflictException);
    });

    it('should rethrow generic errors on create', async () => {
      createVehicleUseCase.execute.mockRejectedValue(
        new Error('generic error'),
      );

      await expect(
        controller.create({
          licensePlate: 'ABC-1234',
          model: 'Civic',
          year: 2024,
          manufacturer: 'Honda',
          color: 'Prata',
          fuelType: 'HYBRID',
          odometer: 15000,
        }),
      ).rejects.toThrow('generic error');
    });

    it('should convert domain exceptions into BadRequestException on create', async () => {
      createVehicleUseCase.execute.mockRejectedValue(
        new InvalidVehicleStatusException('BAD'),
      );

      await expect(
        controller.create({
          licensePlate: 'ABC-1234',
          model: 'Civic',
          year: 2024,
          manufacturer: 'Honda',
          color: 'Prata',
          fuelType: 'HYBRID',
          odometer: 15000,
        }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should find by id successfully', async () => {
      findVehicleByIdUseCase.execute.mockResolvedValue(vehicleFactory());

      const result = await controller.findById(
        '123e4567-e89b-12d3-a456-426614174000',
      );

      expect(result).toBeInstanceOf(VehicleResponseDto);
      expect(result.id).toBe('123e4567-e89b-12d3-a456-426614174000');
    });

    it('should return NotFoundException when vehicle is missing', async () => {
      findVehicleByIdUseCase.execute.mockRejectedValue(
        new VehicleNotFoundException('missing-id'),
      );

      await expect(controller.findById('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should convert generic exception in findById to rethrow', async () => {
      findVehicleByIdUseCase.execute.mockRejectedValue(new Error('db failure'));

      await expect(controller.findById('id-1')).rejects.toThrow('db failure');
    });

    it('should list vehicles paginated', async () => {
      listVehiclesUseCase.execute.mockResolvedValue({
        data: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            licensePlate: 'ABC-1234',
            model: 'Civic',
            year: 2024,
            manufacturer: 'Honda',
            description: 'Carro usado',
            color: 'Prata',
            fuelType: 'HYBRID',
            odometer: 15000,
            status: 'ACTIVE',
            createdAt: new Date('2024-01-01'),
            updatedAt: new Date('2024-01-02'),
          },
        ],
        pagination: { page: 1, limit: 10, total: 1, pages: 1 },
      });

      const result = await controller.findAll({ page: 1, limit: 10 });

      expect(result.data).toHaveLength(1);
      expect(result.data[0]).toBeInstanceOf(VehicleResponseDto);
      expect(result.pagination.page).toBe(1);
    });

    it('should convert VehicleException in findAll to BadRequestException', async () => {
      listVehiclesUseCase.execute.mockRejectedValue(
        new VehicleException('invalid list'),
      );

      await expect(
        controller.findAll({ page: 1, limit: 10 }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should update a vehicle successfully', async () => {
      updateVehicleUseCase.execute.mockResolvedValue({
        id: '123e4567-e89b-12d3-a456-426614174000',
        licensePlate: 'ABC-1234',
        model: 'Fit',
        year: 2022,
        manufacturer: 'Honda',
        description: 'Atualizado',
        color: 'Azul',
        fuelType: 'GASOLINE',
        odometer: 20000,
        status: 'INACTIVE',
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-03'),
      });

      const result = await controller.update(
        '123e4567-e89b-12d3-a456-426614174000',
        { model: 'Fit' },
      );

      expect(result).toBeInstanceOf(VehicleResponseDto);
      expect(result.model).toBe('Fit');
    });

    it('should convert update not-found into NotFoundException', async () => {
      updateVehicleUseCase.execute.mockRejectedValue(
        new VehicleNotFoundException('missing-id'),
      );

      await expect(
        controller.update('missing-id', { model: 'Fit' }),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('should convert VehicleException in update to BadRequestException', async () => {
      updateVehicleUseCase.execute.mockRejectedValue(
        new VehicleException('invalid update'),
      );

      await expect(
        controller.update('id-1', { model: 'Fit' }),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('should delete a vehicle successfully', async () => {
      deleteVehicleUseCase.execute.mockResolvedValue(undefined);

      await expect(
        controller.delete('123e4567-e89b-12d3-a456-426614174000'),
      ).resolves.toBeUndefined();
    });

    it('should convert delete not-found into NotFoundException', async () => {
      deleteVehicleUseCase.execute.mockRejectedValue(
        new VehicleNotFoundException('missing-id'),
      );

      await expect(controller.delete('missing-id')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('should convert VehicleException in delete to BadRequestException', async () => {
      deleteVehicleUseCase.execute.mockRejectedValue(
        new VehicleException('invalid delete'),
      );

      await expect(controller.delete('id-1')).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('VehicleManagementModule', () => {
    it('should instantiate the module metadata', () => {
      const module = new VehicleManagementModule();
      expect(module).toBeInstanceOf(VehicleManagementModule);
      expect(module).toBeDefined();
    });
  });

  describe('DrizzleVehicleRepository', () => {
    it('should save and update an existing vehicle', async () => {
      const vehicle = vehicleFactory();
      const set = jest.fn().mockReturnThis();
      const where = jest.fn().mockResolvedValue(undefined);
      const db = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest
                .fn()
                .mockResolvedValue([{ id: vehicle.getId().getValue() }]),
            }),
          }),
        }),
        update: jest.fn().mockReturnValue({ set, where }),
      };

      const repository = new DrizzleVehicleRepository(db as any);
      await repository.save(vehicle);

      expect(db.update).toHaveBeenCalled();
    });

    it('should insert a new vehicle when not found', async () => {
      const vehicle = vehicleFactory({
        id: '33333333-3333-4333-8333-333333333333',
      });
      const values = jest.fn().mockResolvedValue(undefined);
      const db = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue([]),
            }),
          }),
        }),
        insert: jest.fn().mockReturnValue({ values }),
      };

      const repository = new DrizzleVehicleRepository(db as any);
      await repository.save(vehicle);

      expect(db.insert).toHaveBeenCalled();
    });

    it('should return a vehicle by id or null', async () => {
      const vehicle = vehicleFactory();
      const db = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest
                .fn()
                .mockResolvedValueOnce([
                  {
                    id: vehicle.getId().getValue(),
                    licensePlate: vehicle.getLicensePlate().getValue(),
                    model: vehicle.getVehicleModel().getModel(),
                    year: vehicle.getVehicleModel().getYear(),
                    manufacturer: vehicle.getVehicleModel().getManufacturer(),
                    description: vehicle.getDescription(),
                    color: vehicle.getColor().getValue(),
                    fuelType: vehicle.getFuelType().getValue(),
                    odometer: vehicle.getOdometer().getValue(),
                    status: vehicle.getStatus().getValue(),
                    createdAt: vehicle.getCreatedAt(),
                    updatedAt: vehicle.getUpdatedAt(),
                  },
                ])
                .mockResolvedValueOnce([]),
            }),
          }),
        }),
      };

      const repository = new DrizzleVehicleRepository(db as any);
      const found = await repository.findById(
        new VehicleId(vehicle.getId().getValue()),
      );
      const missing = await repository.findById(
        new VehicleId('44444444-4444-4444-8444-444444444444'),
      );

      expect(found).toBeInstanceOf(Vehicle);
      expect(missing).toBeNull();
    });

    it('should find by license plate and list all vehicles', async () => {
      const vehicle = vehicleFactory({
        id: '55555555-5555-4555-8555-555555555555',
        licensePlate: 'DEF-5678',
      });
      const db = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              limit: jest
                .fn()
                .mockResolvedValueOnce([
                  {
                    id: vehicle.getId().getValue(),
                    licensePlate: vehicle.getLicensePlate().getValue(),
                    model: vehicle.getVehicleModel().getModel(),
                    year: vehicle.getVehicleModel().getYear(),
                    manufacturer: vehicle.getVehicleModel().getManufacturer(),
                    description: vehicle.getDescription(),
                    color: vehicle.getColor().getValue(),
                    fuelType: vehicle.getFuelType().getValue(),
                    odometer: vehicle.getOdometer().getValue(),
                    status: vehicle.getStatus().getValue(),
                    createdAt: vehicle.getCreatedAt(),
                    updatedAt: vehicle.getUpdatedAt(),
                  },
                ])
                .mockResolvedValueOnce([]),
            }),
            limit: jest.fn().mockReturnThis(),
            offset: jest.fn().mockResolvedValue([
              {
                id: vehicle.getId().getValue(),
                licensePlate: vehicle.getLicensePlate().getValue(),
                model: vehicle.getVehicleModel().getModel(),
                year: vehicle.getVehicleModel().getYear(),
                manufacturer: vehicle.getVehicleModel().getManufacturer(),
                description: vehicle.getDescription(),
                color: vehicle.getColor().getValue(),
                fuelType: vehicle.getFuelType().getValue(),
                odometer: vehicle.getOdometer().getValue(),
                status: vehicle.getStatus().getValue(),
                createdAt: vehicle.getCreatedAt(),
                updatedAt: vehicle.getUpdatedAt(),
              },
            ]),
          }),
        }),
      };

      const repository = new DrizzleVehicleRepository(db as any);
      const found = await repository.findByLicensePlate(
        new LicensePlate('DEF-5678'),
      );
      const all = await repository.findAll(10, 0);

      expect(found).toBeInstanceOf(Vehicle);
      expect(all).toHaveLength(1);
    });

    it('should count vehicles and delete by setting status inactive', async () => {
      const vehicle = vehicleFactory();
      const where = jest.fn().mockResolvedValue(undefined);
      const set = jest.fn().mockReturnValue({ where });
      const db: any = {
        select: jest.fn().mockReturnValue({
          from: jest.fn().mockReturnValue({
            from: jest.fn(),
          }),
        }),
        update: jest.fn().mockReturnValue({ set }),
      };

      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      (db.select as jest.Mock).mockReturnValueOnce({
        from: jest.fn().mockReturnValue([{ count: 2 }]),
      });

      const repository = new DrizzleVehicleRepository(db);
      const count = await repository.findAllCount();
      vehicle.delete();
      await repository.delete(vehicle);

      expect(count).toBe(2);
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      expect(db.update as jest.Mock).toHaveBeenCalled();
    });
  });

  it('should expose the table schema metadata', () => {
    expect(vehiclesTable).toBeDefined();
    expect(vehiclesTable).toHaveProperty('id');
  });

  it('should instantiate default DTO values', () => {
    const query = new ListVehiclesQueryDto();
    expect(query.page).toBe(1);
    expect(query.limit).toBe(10);
  });
});
