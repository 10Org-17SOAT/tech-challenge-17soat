import type { Quotation } from '../domain/quotation.entity';
import { escapeHtml, formatBRL, formatDateBR } from './html';

/**
 * The page the customer lands on after clicking the link in the email.
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
    </main>
  </body>
</html>`;
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

export function renderApprovalAlreadyDone(approvedAt: Date | null): string {
  return page({
    icon: 'ℹ️',
    accent: '#06c',
    title: 'Este orçamento já foi aprovado',
    message:
      'Não é preciso fazer nada — a aprovação já está registrada e o serviço segue seu curso.',
    detail: approvedAt
      ? `Aprovado em ${escapeHtml(formatDateBR(approvedAt))}.`
      : undefined,
  });
}

export function renderApprovalExpired(expiredAt: Date): string {
  return page({
    icon: '⌛',
    accent: '#b60',
    title: 'Este link expirou',
    message:
      'Por segurança, os links de aprovação têm prazo. Entre em contato com a oficina e enviaremos um novo orçamento.',
    detail: `Expirou em ${escapeHtml(formatDateBR(expiredAt))}.`,
  });
}

export function renderApprovalInvalid(): string {
  return page({
    icon: '🔍',
    accent: '#c33',
    title: 'Link inválido',
    message:
      'Não encontramos nenhum orçamento para este link. Confira se copiou o endereço completo do email, ou fale com a oficina.',
  });
}

export function renderApprovalUnavailable(): string {
  return page({
    icon: '⚠️',
    accent: '#c33',
    title: 'Não foi possível aprovar agora',
    message:
      'Este orçamento não está mais aguardando aprovação. Entre em contato com a oficina para saber o andamento do serviço.',
  });
}
