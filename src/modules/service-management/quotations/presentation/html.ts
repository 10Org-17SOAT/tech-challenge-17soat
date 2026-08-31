/**
 * Escapes text before it goes into an email or a page. Quotation line names are
 * copied from the service and supply catalogues, which accept free text, so
 * they are untrusted by the time they reach a template.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Cents to "R$ 1.240,00". Integer cents in, formatted string out — no floats
 *  are introduced along the way beyond the final division. */
export function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  });
}

export function formatDateBR(date: Date): string {
  return date.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
}
