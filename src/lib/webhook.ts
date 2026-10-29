import type { CDNConfig, WebhookEvent } from '../config.js';
import { metrics } from './metrics.js';

type Logger = { info: (o: object, m?: string) => void; warn: (o: object, m?: string) => void };

/**
 * Discord webhook alerts — OFF by default, toggle with WEBHOOK_ENABLED.
 * Fire-and-forget, per-event throttling so an error storm (or a kill/restart
 * loop) can't spam Discord or bury the disk in retry logs.
 */
export class DiscordWebhook {
  private lastSent = new Map<string, number>();
  private queue: Promise<void> = Promise.resolve();

  constructor(private cfg: CDNConfig['webhook'], private log: Logger) {}

  enabledFor(event: WebhookEvent): boolean {
    return this.cfg.enabled && !!this.cfg.discordUrl && this.cfg.events.includes(event);
  }

  notify(event: WebhookEvent, title: string, description: string, fields: Record<string, string> = {}): void {
    if (!this.enabledFor(event)) return;
    const now = Date.now();
    if (now - (this.lastSent.get(event) ?? 0) < this.cfg.throttleMs) return;
    this.lastSent.set(event, now);
    // Serialize deliveries; never block or fail the request path.
    this.queue = this.queue.then(() => this.send(event, title, description, fields)).catch(() => undefined);
  }

  private async send(event: WebhookEvent, title: string, description: string, fields: Record<string, string>): Promise<void> {
    const url = this.cfg.discordUrl;
    if (!url) return;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        signal: AbortSignal.timeout(5000),
        body: JSON.stringify({
          username: this.cfg.username,
          embeds: [{
            title: title.slice(0, 256),
            description: description.slice(0, 2000),
            color: event.includes('error') || event.includes('failure') ? 0xdc2626 : 0x2563eb,
            timestamp: new Date().toISOString(),
            fields: Object.entries(fields).slice(0, 10).map(([name, value]) => ({ name: name.slice(0, 256), value: String(value).slice(0, 1024) || '-', inline: true })),
            footer: { text: `CeleCDN • ${event}` },
          }],
        }),
      });
      if (!res.ok) throw new Error(`Discord returned ${res.status}`);
      metrics.webhookEvents.inc({ result: 'ok' });
    } catch (err) {
      metrics.webhookEvents.inc({ result: 'error' });
      this.log.warn({ err }, 'Discord webhook delivery failed'); // log once per throttle window, never per request
    }
  }
}
