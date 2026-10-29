/** Minimal dependency-free Prometheus metrics (no prom-client supply-chain weight). */

class Counter {
  readonly series = new Map<string, number>();
  constructor(readonly name: string, readonly help: string, readonly labels: string[]) {}
  inc(labelValues: Record<string, string> = {}, by = 1): void {
    const key = this.labels.map((l) => `${l}="${(labelValues[l] ?? '').replace(/["\\]/g, '')}"`).join(',');
    this.series.set(key, (this.series.get(key) ?? 0) + by);
  }
  render(): string {
    let out = `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} counter\n`;
    for (const [k, v] of this.series) out += `${this.name}${k ? `{${k}}` : ''} ${v}\n`;
    return out;
  }
}
class Gauge {
  value = 0;
  constructor(readonly name: string, readonly help: string) {}
  render(): string { return `# HELP ${this.name} ${this.help}\n# TYPE ${this.name} gauge\n${this.name} ${this.value}\n`; }
}

export class Metrics {
  requests = new Counter('celecdn_http_requests_total', 'HTTP requests', ['method', 'status', 'route']);
  bytesServed = new Counter('celecdn_bytes_served_total', 'Bytes sent in file bodies', ['area']);
  rangeRequests = new Counter('celecdn_range_requests_total', 'Range requests by outcome', ['outcome']);
  uploads = new Counter('celecdn_uploads_total', 'Completed uploads', ['result']);
  authFailures = new Counter('celecdn_auth_failures_total', 'Failed API auth attempts', []);
  webhookEvents = new Counter('celecdn_webhook_events_total', 'Discord webhook deliveries', ['result']);
  activeStreams = new Gauge('celecdn_active_streams', 'Currently open file streams');
  startedAt = Date.now();

  render(): string {
    const mem = process.memoryUsage();
    return [
      this.requests.render(), this.bytesServed.render(), this.rangeRequests.render(),
      this.uploads.render(), this.authFailures.render(), this.webhookEvents.render(),
      this.activeStreams.render(),
      `# HELP celecdn_uptime_seconds Process uptime\n# TYPE celecdn_uptime_seconds gauge\ncelecdn_uptime_seconds ${Math.floor((Date.now() - this.startedAt) / 1000)}\n`,
      `# HELP celecdn_memory_rss_bytes Resident set size\n# TYPE celecdn_memory_rss_bytes gauge\ncelecdn_memory_rss_bytes ${mem.rss}\n`,
    ].join('');
  }
}
export const metrics = new Metrics();
