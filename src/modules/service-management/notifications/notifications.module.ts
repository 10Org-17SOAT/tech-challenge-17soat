import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CustomerModule } from '../../onboarding/customer/customer.module';
import { VehicleManagementModule } from '../../onboarding/vehicles/vehicle-management.module';
import { ServiceOrdersModule } from '../service-orders/service-orders.module';
import { EMAIL_SENDER } from './domain/email-sender.port';
import type { EmailSender } from './domain/email-sender.port';
import { ORDER_RECIPIENT_QUERY } from './domain/order-recipient.port';
import { BrevoEmailSender } from './infrastructure/brevo-email-sender';
import { LogEmailSender } from './infrastructure/log-email-sender';
import { OnboardingOrderRecipientQuery } from './infrastructure/onboarding-order-recipient.query';

/**
 * Everything that talks to the customer outside the HTTP API: the email
 * driver and the lookup of who the customer of an order is.
 *
 * Quotations imports this module for the approval email, so the arrow only
 * points one way — nothing here may import from quotations.
 */
@Module({
  // Both onboarding modules export only their published query. The recipient
  // adapter is the only thing here that touches either.
  imports: [ServiceOrdersModule, VehicleManagementModule, CustomerModule],
  providers: [
    {
      provide: ORDER_RECIPIENT_QUERY,
      useClass: OnboardingOrderRecipientQuery,
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
  ],
  exports: [EMAIL_SENDER, ORDER_RECIPIENT_QUERY],
})
export class NotificationsModule {}
