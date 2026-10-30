import type { ServiceOrderStatus } from '../../service-orders/domain/service-order.entity';
import type { OrderRecipient } from '../domain/order-recipient.port';
import type {
  ComposedEmail,
  StatusChangeEmailComposer,
  StatusChangeEmailInput,
} from '../domain/status-change-email.port';
import { escapeHtml, formatDateBR } from '../../../../shared/formatting/html';

/**
 * How each status reads to the customer: the name, and one sentence on what
 * happens next. `awaiting_approval` is here for the label alone — that status
 * is announced by the quotation email, which carries the approval link.
 */
export const STATUS_COPY: Record<
  ServiceOrderStatus,
  { label: string; nextStep: string }
> = {
  received: {
    label: 'Recebida',
    nextStep:
      'Recebemos o seu veículo. Em breve um mecânico vai começar o diagnóstico.',
  },
  in_diagnosis: {
    label: 'Em diagnóstico',
    nextStep:
      'Um mecânico está avaliando o veículo. Assim que terminar, você recebe o orçamento por e-mail.',
  },
  awaiting_approval: {
    label: 'Aguardando aprovação',
    nextStep:
      'O orçamento está pronto e o serviço só começa depois da sua aprovação.',
  },
  awaiting_execution: {
    label: 'Aguardando execução',
    nextStep:
      'Orçamento aprovado, obrigado! O serviço entrou na fila e começa assim que um mecânico estiver livre.',
  },
  in_execution: {
    label: 'Em execução',
    nextStep: 'O serviço está sendo feito agora. Avisamos assim que terminar.',
  },
  finished: {
    label: 'Finalizada',
    nextStep:
      'O serviço foi concluído. O veículo é liberado para retirada depois do pagamento.',
  },
  delivered: {
    label: 'Entregue',
    nextStep:
      'Pagamento confirmado e veículo entregue. Obrigado pela preferência!',
  },
};

export function statusChangeSubject(
  status: ServiceOrderStatus,
  recipient: OrderRecipient,
): string {
  const { manufacturer, model, licensePlate } = recipient.vehicle;
  return `${STATUS_COPY[status].label}: ${manufacturer} ${model} (${licensePlate})`;
}

/** Same footing as the quotation email: a plain string and a table layout,
 *  because email clients are not browsers. */
export function renderStatusChangeEmail(input: StatusChangeEmailInput): string {
  const { serviceOrderId, status, occurredAt, recipient } = input;
  const { label, nextStep } = STATUS_COPY[status];
  const vehicle = recipient.vehicle;

  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:24px;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#222;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;background:#fff;padding:24px;border-radius:8px;">
      <tr><td>
        <h1 style="font-size:20px;margin:0 0 16px;">Atualização da sua ordem de serviço</h1>

        <p style="margin:0 0 8px;">Olá, ${escapeHtml(recipient.name)}.</p>
        <p style="margin:0 0 16px;">
          A ordem de serviço do
          <strong>${escapeHtml(vehicle.manufacturer)} ${escapeHtml(vehicle.model)} ${vehicle.year}</strong>,
          placa <strong>${escapeHtml(vehicle.licensePlate)}</strong>, mudou de status:
        </p>

        <p style="margin:0 0 16px;">
          <span style="display:inline-block;background:#0b7;color:#fff;padding:8px 16px;border-radius:6px;font-weight:bold;">
            ${escapeHtml(label)}
          </span>
        </p>

        <p style="margin:0 0 24px;">${escapeHtml(nextStep)}</p>

        <p style="margin:0;color:#888;font-size:12px;">
          OS ${escapeHtml(serviceOrderId)} · ${escapeHtml(formatDateBR(occurredAt))}
        </p>
      </td></tr>
    </table>
  </body>
</html>`;
}

/** The HTML implementation of the domain's composer port. */
export class HtmlStatusChangeEmailComposer implements StatusChangeEmailComposer {
  compose(input: StatusChangeEmailInput): ComposedEmail {
    return {
      subject: statusChangeSubject(input.status, input.recipient),
      html: renderStatusChangeEmail(input),
    };
  }
}
