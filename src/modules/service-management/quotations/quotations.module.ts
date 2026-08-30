import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { StockModule } from '../../stock/stock.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { ServicesModule } from '../services/services.module';
import { ApproveQuotationUseCase } from './application/approve-quotation.usecase';
import { GetQuotationUseCase } from './application/get-quotation.usecase';
import { GetServiceOrderQuotationUseCase } from './application/get-service-order-quotation.usecase';
import { IssueQuotationUseCase } from './application/issue-quotation.usecase';
import { PART_CATALOG } from './domain/part-catalog.port';
import { QUOTATION_REPOSITORY } from './domain/quotation.repository';
import { DrizzleQuotationRepository } from './infrastructure/persistence/drizzle-quotation.repository';
import { StockPartCatalog } from './infrastructure/stock-part-catalog';
import { QuotationsController } from './presentation/quotations.controller';
import { ServiceOrderQuotationController } from './presentation/service-order-quotation.controller';

@Module({
  // StockModule exports only SUPPLY_CATALOG_QUERY — its repositories and use
  // cases stay private, and only StockPartCatalog ever touches that contract.
  imports: [DatabaseModule, ServiceOrdersModule, ServicesModule, StockModule],
  controllers: [QuotationsController, ServiceOrderQuotationController],
  providers: [
    { provide: QUOTATION_REPOSITORY, useClass: DrizzleQuotationRepository },
    { provide: PART_CATALOG, useClass: StockPartCatalog },
    IssueQuotationUseCase,
    ApproveQuotationUseCase,
    GetQuotationUseCase,
    GetServiceOrderQuotationUseCase,
  ],
  exports: [IssueQuotationUseCase],
})
export class QuotationsModule {}
