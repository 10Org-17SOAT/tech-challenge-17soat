import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { Logger } from '@nestjs/common';
import type { EmailMessage, EmailSender } from '../domain/email-sender.port';
import { escapeHtml, formatDateBR } from '../../../../shared/formatting/html';

export interface FileEmailSenderOptions {
  directory: string;
  from: string;
  fromName: string;
  /** Injected so specs get a stable filename. */
  now?: () => Date;
}

/**
 * Sends nothing and writes each message to disk as an `.html` file — the
 * same idea as `FileMailTransport` in `@nestjs/mail`.
 *
 * `.html` rather than `.eml`: it opens with a double click in any browser,
 * which is what a demo or a template check needs. The email itself goes into
 * an `iframe srcdoc`, below a header with the envelope fields, so its styles
 * render exactly as written and cannot leak into that header. The sandbox
 * blocks scripts but still lets a click on the approval link go through.
 *
 * Not for the cluster: a pod's disk is gone with the pod.
 */
export class FileEmailSender implements EmailSender {
  private readonly logger = new Logger(FileEmailSender.name);
  private readonly directory: string;
  private readonly now: () => Date;

  constructor(private readonly options: FileEmailSenderOptions) {
    this.directory = resolve(options.directory);
    this.now = options.now ?? (() => new Date());
  }

  async send(message: EmailMessage): Promise<void> {
    const sentAt = this.now();
    const path = resolve(this.directory, this.fileNameFor(message, sentAt));

    await mkdir(this.directory, { recursive: true });
    await writeFile(path, this.render(message, sentAt), 'utf8');

    this.logger.log(
      `[MAIL_DRIVER=file] Para: ${message.toName} <${message.to}> — ${message.subject}\n${path}`,
    );
  }

  // `<timestamp>--<tag>.html`: sorts by time in any file listing, and says
  // which order and status it is about before it is opened. Colons and dots
  // are dropped from the timestamp because Windows rejects the former.
  private fileNameFor(message: EmailMessage, sentAt: Date): string {
    const timestamp = sentAt.toISOString().replace(/[:.]/g, '-');
    const tag = (message.tag ?? 'message').replace(/[^A-Za-z0-9_-]/g, '_');
    return `${timestamp}--${tag}.html`;
  }

  private render(message: EmailMessage, sentAt: Date): string {
    const header = [
      ['De', `${this.options.fromName} <${this.options.from}>`],
      ['Para', `${message.toName} <${message.to}>`],
      ['Assunto', message.subject],
      ['Data', formatDateBR(sentAt)],
    ]
      .map(
        ([label, value]) =>
          `<tr><th>${label}</th><td>${escapeHtml(value)}</td></tr>`,
      )
      .join('\n        ');

    return `<!doctype html>
<html lang="pt-BR">
  <head>
    <meta charset="utf-8" />
    <title>${escapeHtml(message.subject)}</title>
    <style>
      body { margin: 0; font-family: Arial, Helvetica, sans-serif; background: #e9e9e9; }
      table { width: 100%; border-collapse: collapse; background: #fff; border-bottom: 1px solid #ccc; }
      th, td { padding: 6px 16px; text-align: left; font-size: 14px; }
      th { width: 80px; color: #666; font-weight: normal; }
      iframe { display: block; width: 100%; height: calc(100vh - 130px); border: 0; }
    </style>
  </head>
  <body>
    <table>
        ${header}
    </table>
    <iframe sandbox="allow-popups allow-popups-to-escape-sandbox allow-top-navigation-by-user-activation" srcdoc="${escapeHtml(message.html)}"></iframe>
  </body>
</html>
`;
  }
}
