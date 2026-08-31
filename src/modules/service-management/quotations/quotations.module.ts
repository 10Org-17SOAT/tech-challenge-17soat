import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DatabaseModule } from '../../../shared/config/database/database.module';
import { CustomerModule } from '../../onboarding/customer/customer.module';
import { VehicleManagementModule } from '../../onboarding/vehicles/vehicle-management.module';
import { StockModule } from '../../stock/stock.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { ServicesModule } from '../services/services.module';
import { ApproveQuotationByTokenUseCase } from './application/approve-quotation-by-token.usecase';
import { ApproveQuotationUseCase } from './application/approve-quotation.usecase';
import { GetQuotationUseCase } from './application/get-quotation.usecase';
import { GetServiceOrderQuotationUseCase } from './application/get-service-order-quotation.usecase';
import { IssueQuotationUseCase } from './application/issue-quotation.usecase';
import { SendQuotationApprovalEmailUseCase } from './application/send-quotation-approval-email.usecase';
import { EMAIL_SENDER } from './domain/email-sender.port';
import type { EmailSender } from './domain/email-sender.port';
import { PART_CATALOG } from './domain/part-catalog.port';
import { QUOTATION_RECIPIENT_QUERY } from './domain/quotation-recipient.port';
import { QUOTATION_REPOSITORY } from './domain/quotation.repository';
import { DrizzleQuotationRepository } from './infrastructure/persistence/drizzle-quotation.repository';
import { BrevoEmailSender } from './infrastructure/brevo-email-sender';
import { LogEmailSender } from './infrastructure/log-email-sender';
import { OnboardingQuotationRecipientQuery } from './infrastructure/onboarding-quotation-recipient.query';
import { StockPartCatalog } from './infrastructure/stock-part-catalog';
import { QuotationApprovalLinkController } from './presentation/quotation-approval-link.controller';
import { QuotationsController } from './presentation/quotations.controller';
import { ServiceOrderQuotationController } from './presentation/service-order-quotation.controller';

@Module({
  // StockModule exports only SUPPLY_CATALOG_QUERY — its repositories and use
  // cases stay private, and only StockPartCatalog ever touches that contract.
  imports: [
    DatabaseModule,
    ServiceOrdersModule,
    ServicesModule,
    StockModule,
    // Both export only their published query. The recipient adapter is the
    // only thing here that touches either.
    VehicleManagementModule,
    CustomerModule,
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
    {
      provide: QUOTATION_RECIPIENT_QUERY,
      useClass: OnboardingQuotationRecipientQuery,
    },
    // Chosen at boot from MAIL_DRIVER. `log` is the default so a fresh clone
    // and the e2e suite never reach a provider or need an API key.
    {
      provide: EMAIL_SENDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): EmailSender =>
        config.get<string>('MAIL_DRIVER') === 'brevo'
          ? new BrevoEmailSender(config)
          : new LogEmailSender(),
    },
    IssueQuotationUseCase,
    ApproveQuotationUseCase,
    ApproveQuotationByTokenUseCase,
    SendQuotationApprovalEmailUseCase,
    GetQuotationUseCase,
    GetServiceOrderQuotationUseCase,
  ],
  // Both consumed by diagnostics: completing a diagnosis issues the quotation
  // and then emails it.
  exports: [IssueQuotationUseCase, SendQuotationApprovalEmailUseCase],
})
export class QuotationsModule {}
