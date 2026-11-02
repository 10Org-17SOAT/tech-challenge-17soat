import {
  REJECTION_REASON_MAX_LENGTH,
  type Quotation,
  type QuotationDecision,
} from '../domain/quotation.entity';
import {
  escapeHtml,
  formatBRL,
  formatDateBR,
} from '../../../../shared/formatting/html';

/**
 * The pages the customer sees after clicking the link in the email: the
 * quotation with its two answers, and whatever comes after answering.
 *
 * This is the one HTTP surface of the API that answers in HTML rather than
 * JSON, and deliberately so: whoever opens this URL is a person in a browser
 * who was sent here from their inbox, not a client integrating with the API.
 * A JSON body would leave them unable to tell whether their car is being
 * fixed. The JSON endpoints are untouched and still serve every other caller.
 */
function page(input: {
  icon: string;
  title: string;
  message: string;
  accent: string;
  detail?: string;
  body?: string;
}): string {
  return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(input.title)}</title>
  </head>
  <body style="margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#222;padding:24px;">
    <main style="max-width:520px;width:100%;background:#fff;border-radius:12px;padding:32px;text-align:center;box-shadow:0 1px 4px rgba(0,0,0,.08);">
      <div style="font-size:48px;line-height:1;margin-bottom:16px;">${input.icon}</div>
      <h1 style="font-size:22px;margin:0 0 12px;color:${input.accent};">${escapeHtml(input.title)}</h1>
      <p style="margin:0;font-size:15px;line-height:1.5;color:#555;">${input.message}</p>
      ${input.detail ? `<p style="margin:16px 0 0;font-size:13px;color:#888;">${input.detail}</p>` : ''}
      ${input.body ?? ''}
    </main>
  </body>
</html>`;
}

const buttonStyle = (background: string) =>
  `display:inline-block;width:100%;box-sizing:border-box;border:0;background:${background};color:#fff;padding:12px 24px;border-radius:6px;font-weight:bold;font-size:15px;cursor:pointer;`;

/**
 * Posts to `decision/confirm`, relative on purpose: it resolves against this
 * page's own `/quotations/decision`, so the form keeps working behind any
 * prefix the API is mounted under.
 */
function approveForm(token: string): string {
  return `
      <form method="post" action="decision/confirm" style="margin:24px 0 0;">
        <input type="hidden" name="token" value="${escapeHtml(token)}" />
        <input type="hidden" name="decision" value="approved" />
        <button type="submit" style="${buttonStyle('#0b7')}">Confirmar aprovação</button>
      </form>`;
}

function rejectForm(token: string): string {
  return `
      <form method="post" action="decision/confirm" style="margin:24px 0 0;text-align:left;">
        <input type="hidden" name="token" value="${escapeHtml(token)}" />
        <input type="hidden" name="decision" value="rejected" />
        <label for="reason" style="display:block;font-size:13px;color:#555;margin:0 0 6px;">Motivo da recusa (opcional)</label>
        <textarea id="reason" name="reason" rows="3" maxlength="${REJECTION_REASON_MAX_LENGTH}" style="width:100%;box-sizing:border-box;padding:8px;border:1px solid #ccc;border-radius:6px;font:inherit;margin:0 0 12px;"></textarea>
        <button type="submit" style="${buttonStyle('#c33')}">Confirmar recusa</button>
      </form>`;
}

function switchLink(token: string, decision: QuotationDecision): string {
  const label = decision === 'approved' ? 'Prefiro aprovar' : 'Prefiro recusar';
  return `<p style="margin:16px 0 0;font-size:13px;"><a href="?token=${encodeURIComponent(token)}&amp;decision=${decision}" style="color:#06c;">${label}</a></p>`;
}

function itemsTable(quotation: Quotation): string {
  const rows = quotation.items
    .map(
      (item) => `
          <tr>
            <td style="padding:6px 0;border-bottom:1px solid #eee;">${escapeHtml(item.nameSnapshot)} <span style="color:#888;">×${item.quantity}</span></td>
            <td style="padding:6px 0;border-bottom:1px solid #eee;text-align:right;">${formatBRL(item.subtotalInCents)}</td>
          </tr>`,
    )
    .join('');
  return `
      <table role="presentation" style="width:100%;border-collapse:collapse;font-size:14px;text-align:left;margin:24px 0 0;">
        ${rows}
        <tr>
          <td style="padding:12px 0 0;font-weight:bold;">Total</td>
          <td style="padding:12px 0 0;text-align:right;font-weight:bold;font-size:17px;">${formatBRL(quotation.totalInCents)}</td>
        </tr>
      </table>`;
}

/**
 * Shows the quotation and asks for an answer — and changes nothing. Mail
 * scanners and link prefetchers open this URL too, so the answer has to be a
 * POST a person submits: no crawler fills in a form.
 *
 * `preferred` is the button the customer clicked in the email. That answer is
 * offered first, with a way to switch; without it, both are on the page.
 */
export function renderDecisionPage(
  quotation: Quotation,
  token: string,
  preferred: QuotationDecision | null,
): string {
  const actions =
    preferred === 'approved'
      ? approveForm(token) + switchLink(token, 'rejected')
      : preferred === 'rejected'
        ? rejectForm(token) + switchLink(token, 'approved')
        : approveForm(token) + rejectForm(token);

  const expiresAt = quotation.approvalTokenExpiresAt;
  return page({
    icon: '🧾',
    accent: '#222',
    title: 'Orçamento do seu veículo',
    message:
      preferred === 'rejected'
        ? 'Confira o orçamento antes de recusar. Se quiser, conte o motivo para a oficina.'
        : 'Confira o orçamento e registre sua resposta.',
    body:
      itemsTable(quotation) +
      actions +
      (expiresAt
        ? `<p style="margin:16px 0 0;font-size:12px;color:#888;">Este link vale até ${escapeHtml(formatDateBR(expiresAt))}.</p>`
        : ''),
  });
}

/** What a decided quotation shows instead of the forms, and after answering. */
export function renderDecisionResult(quotation: Quotation): string {
  return quotation.status === 'rejected'
    ? renderRejectionSuccess(quotation)
    : renderApprovalSuccess(quotation);
}

export function renderApprovalSuccess(quotation: Quotation): string {
  return page({
    icon: '✅',
    accent: '#0a7',
    title: 'Orçamento aprovado',
    message: `Obrigado! Recebemos sua aprovação no valor de <strong>${formatBRL(quotation.totalInCents)}</strong> e o serviço já entrou na fila de execução.`,
    detail: `Aprovado em ${escapeHtml(formatDateBR(quotation.approvedAt ?? new Date()))}.`,
  });
}

export function renderRejectionSuccess(quotation: Quotation): string {
  return page({
    icon: '📝',
    accent: '#06c',
    title: 'Orçamento recusado',
    message:
      'Registramos sua recusa. A oficina vai revisar o diagnóstico e entrar em contato com um novo orçamento.',
    detail: `Recusado em ${escapeHtml(formatDateBR(quotation.rejectedAt ?? new Date()))}.`,
  });
}

export function renderAlreadyApproved(): string {
  return page({
    icon: 'ℹ️',
    accent: '#06c',
    title: 'Este orçamento já foi aprovado',
    message:
      'A aprovação já está registrada e não pode mais ser trocada por uma recusa. Se precisar mudar algo, fale com a oficina.',
  });
}

export function renderAlreadyRejected(): string {
  return page({
    icon: 'ℹ️',
    accent: '#06c',
    title: 'Este orçamento já foi recusado',
    message:
      'A recusa já está registrada e a oficina vai enviar um novo orçamento. Se quiser seguir com este, fale com a oficina.',
  });
}

export function renderDecisionExpired(expiredAt: Date): string {
  return page({
    icon: '⌛',
    accent: '#b60',
    title: 'Este link expirou',
    message:
      'Por segurança, os links de orçamento têm prazo. Entre em contato com a oficina e enviaremos um novo orçamento.',
    detail: `Expirou em ${escapeHtml(formatDateBR(expiredAt))}.`,
  });
}

export function renderDecisionLinkInvalid(): string {
  return page({
    icon: '🔍',
    accent: '#c33',
    title: 'Link inválido',
    message:
      'Não encontramos nenhum orçamento para este link. Confira se copiou o endereço completo do email, ou fale com a oficina.',
  });
}

export function renderDecisionUnavailable(): string {
  return page({
    icon: '⚠️',
    accent: '#c33',
    title: 'Não foi possível registrar sua resposta',
    message:
      'Este orçamento não está mais aguardando resposta. Entre em contato com a oficina para saber o andamento do serviço.',
  });
}

export function renderDecisionRefused(): string {
  return page({
    icon: '⚠️',
    accent: '#c33',
    title: 'Não foi possível registrar sua resposta',
    message: `Confira o formulário e tente de novo. O motivo da recusa pode ter até ${REJECTION_REASON_MAX_LENGTH} caracteres.`,
  });
}
