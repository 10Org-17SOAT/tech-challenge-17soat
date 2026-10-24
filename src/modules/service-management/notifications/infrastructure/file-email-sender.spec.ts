import { mkdtemp, readdir, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { FileEmailSender } from './file-email-sender';

describe('FileEmailSender', () => {
  let directory: string;
  let sender: FileEmailSender;

  beforeEach(async () => {
    directory = join(await mkdtemp(join(tmpdir(), 'mail-')), 'nested');
    sender = new FileEmailSender({
      directory,
      from: 'oficina@example.com',
      fromName: 'Oficina',
      now: () => new Date('2026-10-24T13:05:12.345Z'),
    });
  });

  afterEach(async () => {
    await rm(join(directory, '..'), { recursive: true, force: true });
  });

  const message = {
    to: 'ana@example.com',
    toName: 'Ana Souza',
    subject: 'OS em diagnóstico',
    html: '<p class="body">Olá, "Ana"</p>',
    tag: 'order-1--in_diagnosis',
  };

  it('writes one file per message, named by time and tag', async () => {
    await sender.send(message);

    await expect(readdir(directory)).resolves.toEqual([
      '2026-10-24T13-05-12-345Z--order-1--in_diagnosis.html',
    ]);
  });

  it('shows the envelope above the escaped body', async () => {
    await sender.send(message);

    const [file] = await readdir(directory);
    const page = await readFile(join(directory, file), 'utf8');

    expect(page).toContain('Oficina &lt;oficina@example.com&gt;');
    expect(page).toContain('Ana Souza &lt;ana@example.com&gt;');
    expect(page).toContain('<title>OS em diagnóstico</title>');
    expect(page).toContain(
      'srcdoc="&lt;p class=&quot;body&quot;&gt;Olá, &quot;Ana&quot;&lt;/p&gt;"',
    );
  });

  it('falls back to a generic name and strips unsafe characters', async () => {
    await sender.send({ ...message, tag: undefined });
    await sender.send({ ...message, tag: '../../etc/passwd' });

    const files = await readdir(directory);
    expect(files).toContain('2026-10-24T13-05-12-345Z--message.html');
    expect(files).toContain('2026-10-24T13-05-12-345Z--______etc_passwd.html');
  });
});
