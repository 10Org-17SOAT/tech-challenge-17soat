import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { InventoryModule } from '../../stock/inventory/inventory.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { ServicesModule } from '../services/services.module';
import { ApproveQuotationByTokenUseCase } from './application/approve-quotation-by-token.usecase';
import { ApproveQuotationUseCase } from './application/approve-quotation.usecase';
import { GetQuotationUseCase } from './application/get-quotation.usecase';
import { GetServiceOrderQuotationUseCase } from './application/get-service-order-quotation.usecase';
import { IssueQuotationUseCase } from './application/issue-quotation.usecase';
import { SendQuotationApprovalEmailUseCase } from './application/send-quotation-approval-email.usecase';
import { PART_CATALOG } from './domain/part-catalog.port';
import { QUOTATION_REPOSITORY } from './domain/quotation.repository';
import { DrizzleQuotationRepository } from './infrastructure/persistence/drizzle-quotation.repository';
import { StockPartCatalog } from './infrastructure/stock-part-catalog';
import { SERVICE_ORDER_BILLING_QUERY } from './public/service-order-billing.query';
import { ServiceOrderBillingQueryImpl } from './public/service-order-billing.query.impl';
import { QuotationApprovalLinkController } from './presentation/quotation-approval-link.controller';
import { QuotationsController } from './presentation/quotations.controller';
import { ServiceOrderQuotationController } from './presentation/service-order-quotation.controller';

@Module({
  // InventoryModule exports only SUPPLY_CATALOG_QUERY — its repositories and use
  // cases stay private, and only StockPartCatalog ever touches that contract.
  imports: [
    DatabaseModule,
    ServiceOrdersModule,
    ServicesModule,
    InventoryModule,
    // For EMAIL_SENDER and ORDER_RECIPIENT_QUERY: who the customer is and how
    // to reach them belong to notifications, which also emails status changes.
    NotificationsModule,
  ],
  // QuotationApprovalLinkController comes first on purpose: it owns
  // `GET /quotations/approve`, and Nest matches in registration order, so
  // `GET /quotations/:id` would otherwise swallow it and answer a JSON 400
  // about "approve" not being a UUID.
  controllers: [
    QuotationApprovalLinkController,
    QuotationsController,
    ServiceOrderQuotationController,
  ],
  providers: [
    { provide: QUOTATION_REPOSITORY, useClass: DrizzleQuotationRepository },
    { provide: PART_CATALOG, useClass: StockPartCatalog },
    IssueQuotationUseCase,
    ApproveQuotationUseCase,
    ApproveQuotationByTokenUseCase,
    SendQuotationApprovalEmailUseCase,
    GetQuotationUseCase,
    GetServiceOrderQuotationUseCase,
    {
      provide: SERVICE_ORDER_BILLING_QUERY,
      useClass: ServiceOrderBillingQueryImpl,
    },
  ],
  // The first two are consumed by diagnostics: completing a diagnosis issues
  // the quotation and then emails it — same bounded context, direct calls.
  // SERVICE_ORDER_BILLING_QUERY is the published contract for the payment
  // context, which may import nothing else from here.
  exports: [
    IssueQuotationUseCase,
    SendQuotationApprovalEmailUseCase,
    SERVICE_ORDER_BILLING_QUERY,
  ],
})
export class QuotationsModule {}
