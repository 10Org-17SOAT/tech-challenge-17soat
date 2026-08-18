import { Module } from '@nestjs/common';
import { CreateSupplyUseCase } from './application/create-supply.usecase';
import { DeleteSupplyUseCase } from './application/delete-supply.usecase';
import { GetSupplyUseCase } from './application/get-supply.usecase';
import { ListSuppliesUseCase } from './application/list-supplies.usecase';
import { UpdateSupplyUseCase } from './application/update-supply.usecase';
import { SUPPLY_REPOSITORY } from './domain/supply.repository';
import { DrizzleSupplyRepository } from './infrastructure/persistence/drizzle-supply.repository';
import { SuppliesController } from './presentation/supplies.controller';

@Module({
  controllers: [SuppliesController],
  providers: [
    { provide: SUPPLY_REPOSITORY, useClass: DrizzleSupplyRepository },
    CreateSupplyUseCase,
    GetSupplyUseCase,
    ListSuppliesUseCase,
    UpdateSupplyUseCase,
    DeleteSupplyUseCase,
  ],
  exports: [],
})
export class StockModule {}
