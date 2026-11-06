import { loggerFor, safe } from '../common';
import { NotificationFailed } from '../errors';
import type { NotificationType, NtfyConfigType } from '../types';

const logger = loggerFor('clients/ntfy');

class NtfyClient {
  private readonly url: string;
  constructor({ url, topic }: NtfyConfigType) {
    this.url = `${url}/${encodeURIComponent(topic)}`;
  }

  publish = safe(async ({ title, message, priority, tags }: NotificationType) => {
    logger.info(`[~] publishing notification [${title}]`);
    const response = await fetch(this.url, { method: 'POST', body: message, headers: { title, priority, tags: tags.join(',') } });

    if (!response.ok) throw new NotificationFailed(`ntfy publish failed with status ${response.status}`, { title, status: response.status });
    logger.info(`[+] published notification [${title}]`);
  });
}

export { NtfyClient };
