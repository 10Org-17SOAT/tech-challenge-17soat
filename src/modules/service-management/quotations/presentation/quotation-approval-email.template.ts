import type { Quotation } from '../domain/quotation.entity';
import type { QuotationRecipient } from '../domain/quotation-recipient.port';
import { escapeHtml, formatBRL, formatDateBR } from './html';

/**
 * The email the customer receives. A plain string — no template engine and no
 * dependency, because there is exactly one message to draw.
 *
 * Table-based layout on purpose: email clients are not browsers, and flexbox
 * and grid are unreliable across Outlook and Gmail.
 */
export function renderQuotationApprovalEmail(input: {
  quotation: Quotation;
  recipient: QuotationRecipient;
  approvalUrl: string;
}): string {
  const { quotation, recipient, approvalUrl } = input;
  const vehicle = recipient.vehicle;

  const rows = quotation.items
    .map(
      (item) => `
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #eee;">
            ${escapeHtml(item.nameSnapshot)}
            <span style="color:#888;font-size:12px;">
              (${item.kind === 'labor' ? 'serviço' : 'peça'})
            </span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:center;">${item.quantity}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${formatBRL(item.unitPriceInCents)}</td>
          <td style="padding:8px 0;border-bottom:1px solid #eee;text-align:right;">${formatBRL(item.subtotalInCents)}</td>
        </tr>`,
    )
    .join('');

  const expiresAt = quotation.approvalTokenExpiresAt;

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#222;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;padding:24px;border-radius:8px;">
      <tr><td>
        <h1 style="font-size:20px;margin:0 0 16px;">Orçamento do seu veículo</h1>

        <p style="margin:0 0 8px;">Olá, ${escapeHtml(recipient.name)}.</p>
        <p style="margin:0 0 16px;">
          Segue o orçamento para o
          <strong>${escapeHtml(vehicle.manufacturer)} ${escapeHtml(vehicle.model)} ${vehicle.year}</strong>,
          placa <strong>${escapeHtml(vehicle.licensePlate)}</strong>.
        </p>

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;font-size:14px;">
          <tr style="text-align:left;color:#666;font-size:12px;text-transform:uppercase;">
            <th style="padding:8px 0;">Item</th>
            <th style="padding:8px 0;text-align:center;">Qtd</th>
            <th style="padding:8px 0;text-align:right;">Unitário</th>
            <th style="padding:8px 0;text-align:right;">Subtotal</th>
          </tr>
          ${rows}
          <tr>
            <td colspan="3" style="padding:16px 0 0;font-weight:bold;">Total</td>
            <td style="padding:16px 0 0;text-align:right;font-weight:bold;font-size:18px;">
              ${formatBRL(quotation.totalInCents)}
            </td>
          </tr>
        </table>

        <p style="margin:24px 0 8px;">Se estiver de acordo, aprove pelo botão abaixo:</p>
        <p style="margin:0 0 16px;">
          <a href="${approvalUrl}" style="display:inline-block;background:#0b7;color:#fff;text-decoration:none;padding:12px 24px;border-radius:6px;font-weight:bold;">
            Aprovar orçamento
          </a>
        </p>
        ${
          expiresAt
            ? `<p style="margin:0;color:#888;font-size:12px;">Este link vale até ${escapeHtml(formatDateBR(expiresAt))}.</p>`
            : ''
        }
      </td></tr>
    </table>
  </body>
</html>`;
}
