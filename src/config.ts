/**
 * CeleCDN configuration — validated, deeply-cloned, environment-driven.
 * Every value is checked at startup; invalid config fails fast with ALL
 * problems listed (no NaN ports, no crash-loops on a typo'd log level).
 */

export type LogLevel = 'fatal' | 'error' | 'warn' | 'info' | 'debug' | 'trace' | 'silent';
export type WebhookEvent =
  | 'server.start' | 'server.error' | 'upload' | 'file.delete'
  | 'token.create' | 'token.revoke' | 'auth.failure' | 'rate.limit';

export interface CDNConfig {
  port: number;
  host: string;
  /** Web assets root (strict allowlist). */
  rootDirectory: string;
  /** Versioned package registry root, served under /dl/. */
  packageDirectory: string;
  /** Runtime state (token store). Must be on the persistent volume. */
  dataDirectory: string;
  cache: { staticAssets: number; mediaFiles: number; documents: number; textFiles: number; default: number };
  rateLimit: { enabled: boolean; maxRequests: number; timeWindow: string; authMaxRequests: number; trustProxy: boolean | string };
  security: {
    cors: { enabled: boolean; origins: string[] | boolean; credentials: boolean; maxAge: number };
    helmet: { enabled: boolean; contentSecurityPolicy: boolean };
    /** Extensions served from the web root. Empty list = deny everything. */
    webAllowedExtensions: string[];
    /** Extensions allowed in the /dl/ package registry. */
    packageAllowedExtensions: string[];
    maxFileSize: number;
    maxUploadSize: number;
    adminToken: string | null;
    apiEnabled: boolean;
  };
  streaming: { maxConcurrentStreams: number; rangeEnabled: boolean };
  compression: { enabled: boolean; threshold: number };
  logging: { enabled: boolean; level: LogLevel; prettyPrint: boolean };
  metrics: { enabled: boolean; public: boolean };
  healthCheck: { enabled: boolean; path: string };
  webhook: { enabled: boolean; discordUrl: string | null; events: WebhookEvent[]; throttleMs: number; username: string };
}

const int = (v: string | undefined, name: string, min: number, max: number, errs: string[]): number | undefined => {
  if (v === undefined || v === '') return undefined;
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) { errs.push(`${name} must be an integer ${min}..${max}, got "${v}"`); return undefined; }
  return n;
};
const bool = (v: string | undefined, name: string, errs: string[]): boolean | undefined => {
  if (v === undefined || v === '') return undefined;
  if (['1', 'true', 'yes', 'on'].includes(v.toLowerCase())) return true;
  if (['0', 'false', 'no', 'off'].includes(v.toLowerCase())) return false;
  errs.push(`${name} must be a boolean, got "${v}"`); return undefined;
};
const list = (v: string | undefined): string[] | undefined =>
  v === undefined || v.trim() === '' ? undefined : v.split(',').map((s) => s.trim()).filter(Boolean);
const exts = (v: string[] | undefined, fallback: string[]): string[] =>
  (v ?? fallback).map((e) => (e.startsWith('.') ? e : `.${e}`).toLowerCase());

const LOG_LEVELS: LogLevel[] = ['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'];
const WEBHOOK_EVENTS: WebhookEvent[] = ['server.start', 'server.error', 'upload', 'file.delete', 'token.create', 'token.revoke', 'auth.failure', 'rate.limit'];

export const defaultConfig: CDNConfig = {
  port: 3005,
  host: '0.0.0.0',
  rootDirectory: './public',
  packageDirectory: './packages',
  dataDirectory: './data',
  cache: { staticAssets: 31_536_000, mediaFiles: 2_592_000, documents: 86_400, textFiles: 3_600, default: 3_600 },
  rateLimit: { enabled: true, maxRequests: 1000, timeWindow: '1 minute', authMaxRequests: 60, trustProxy: false },
  security: {
    cors: { enabled: true, origins: ['*'], credentials: false, maxAge: 86_400 },
    helmet: { enabled: true, contentSecurityPolicy: true },
    webAllowedExtensions: exts(undefined, [
      'css js mjs map json txt md csv xml html svg png jpg jpeg gif webp avif ico woff woff2 ttf otf',
      'mp3 mp4 wav ogg m4a flac aac webm mov pdf',
    ].join(' ').split(' ')),
    packageAllowedExtensions: exts(undefined, [
      'exe msi dmg pkg deb rpm appimage apk ipa bin run jar war dll so dylib',
      'sh bash zsh ps1 bat cmd py rb pl js mjs cjs ts php lua',
      'zip tar gz tgz bz2 xz 7z rar txt md json toml yaml yml sha256 sig asc',
    ].join(' ').split(' ')),
    maxFileSize: 500 * 1024 * 1024,
    maxUploadSize: 1024 * 1024 * 1024,
    adminToken: null,
    apiEnabled: true,
  },
  streaming: { maxConcurrentStreams: 128, rangeEnabled: true },
  compression: { enabled: true, threshold: 1024 },
  logging: { enabled: true, level: 'info', prettyPrint: false },
  metrics: { enabled: true, public: false },
  healthCheck: { enabled: true, path: '/health' },
  webhook: { enabled: false, discordUrl: null, events: [...WEBHOOK_EVENTS], throttleMs: 60_000, username: 'CeleCDN' },
};

export function getConfig(env: NodeJS.ProcessEnv = process.env): CDNConfig {
  const errs: string[] = [];
  const cfg: CDNConfig = structuredClone(defaultConfig);

  const port = int(env.CDN_PORT, 'CDN_PORT', 1, 65535, errs); if (port !== undefined) cfg.port = port;
  if (env.CDN_HOST) cfg.host = env.CDN_HOST;
  if (env.CDN_ROOT_DIR) cfg.rootDirectory = env.CDN_ROOT_DIR;
  if (env.CDN_PACKAGE_DIR) cfg.packageDirectory = env.CDN_PACKAGE_DIR;
  if (env.CDN_DATA_DIR) cfg.dataDirectory = env.CDN_DATA_DIR;

  const rl = int(env.CDN_RATE_LIMIT_MAX, 'CDN_RATE_LIMIT_MAX', 1, 1_000_000, errs); if (rl !== undefined) cfg.rateLimit.maxRequests = rl;
  const authRl = int(env.CDN_RATE_LIMIT_AUTH_MAX, 'CDN_RATE_LIMIT_AUTH_MAX', 1, 100_000, errs); if (authRl !== undefined) cfg.rateLimit.authMaxRequests = authRl;
  const rlOn = bool(env.CDN_RATE_LIMIT_ENABLED, 'CDN_RATE_LIMIT_ENABLED', errs); if (rlOn !== undefined) cfg.rateLimit.enabled = rlOn;
  if (env.CDN_TRUST_PROXY !== undefined && env.CDN_TRUST_PROXY !== '') {
    const b = bool(env.CDN_TRUST_PROXY, 'CDN_TRUST_PROXY', errs);
    cfg.rateLimit.trustProxy = b !== undefined ? b : env.CDN_TRUST_PROXY; // string = proxy IP/CIDR allowlist passed to Fastify
  }

  const corsOrigins = list(env.CDN_CORS_ORIGIN);
  if (corsOrigins) cfg.security.cors.origins = corsOrigins;
  const creds = bool(env.CDN_CORS_CREDENTIALS, 'CDN_CORS_CREDENTIALS', errs); if (creds !== undefined) cfg.security.cors.credentials = creds;
  if (cfg.security.cors.credentials && Array.isArray(cfg.security.cors.origins) && cfg.security.cors.origins.includes('*')) {
    errs.push('CDN_CORS_CREDENTIALS=true cannot be combined with CDN_CORS_ORIGIN=* (browsers reject it; it is also unsafe)');
  }
  const webExt = list(env.CDN_WEB_EXTENSIONS); if (webExt) cfg.security.webAllowedExtensions = exts(webExt, []);
  const pkgExt = list(env.CDN_PACKAGE_EXTENSIONS); if (pkgExt) cfg.security.packageAllowedExtensions = exts(pkgExt, []);

  const maxFile = int(env.CDN_MAX_FILE_SIZE, 'CDN_MAX_FILE_SIZE', 0, 100 * 1024 * 1024 * 1024, errs); if (maxFile !== undefined) cfg.security.maxFileSize = maxFile;
  const maxUp = int(env.CDN_MAX_UPLOAD_SIZE, 'CDN_MAX_UPLOAD_SIZE', 1, 100 * 1024 * 1024 * 1024, errs); if (maxUp !== undefined) cfg.security.maxUploadSize = maxUp;
  cfg.security.adminToken = env.CDN_ADMIN_TOKEN ? env.CDN_ADMIN_TOKEN : null;
  const api = bool(env.CDN_API_ENABLED, 'CDN_API_ENABLED', errs); if (api !== undefined) cfg.security.apiEnabled = api;

  const streams = int(env.CDN_MAX_STREAMS, 'CDN_MAX_STREAMS', 1, 100_000, errs); if (streams !== undefined) cfg.streaming.maxConcurrentStreams = streams;
  const comp = bool(env.CDN_COMPRESSION_ENABLED, 'CDN_COMPRESSION_ENABLED', errs); if (comp !== undefined) cfg.compression.enabled = comp;
  const compT = int(env.CDN_COMPRESSION_THRESHOLD, 'CDN_COMPRESSION_THRESHOLD', 0, 1024 * 1024, errs); if (compT !== undefined) cfg.compression.threshold = compT;

  if (env.CDN_LOG_LEVEL) {
    if ((LOG_LEVELS as string[]).includes(env.CDN_LOG_LEVEL)) cfg.logging.level = env.CDN_LOG_LEVEL as LogLevel;
    else errs.push(`CDN_LOG_LEVEL must be one of ${LOG_LEVELS.join('|')}, got "${env.CDN_LOG_LEVEL}"`);
  }
  const pretty = bool(env.CDN_LOG_PRETTY, 'CDN_LOG_PRETTY', errs);
  cfg.logging.prettyPrint = pretty !== undefined ? pretty : env.NODE_ENV !== 'production';
  const metrics = bool(env.CDN_METRICS_ENABLED, 'CDN_METRICS_ENABLED', errs); if (metrics !== undefined) cfg.metrics.enabled = metrics;
  const metricsPub = bool(env.CDN_METRICS_PUBLIC, 'CDN_METRICS_PUBLIC', errs); if (metricsPub !== undefined) cfg.metrics.public = metricsPub;
  if (env.CDN_HEALTH_PATH) {
    if (env.CDN_HEALTH_PATH.startsWith('/') && !env.CDN_HEALTH_PATH.startsWith('/dl') && env.CDN_HEALTH_PATH !== '/') cfg.healthCheck.path = env.CDN_HEALTH_PATH;
    else errs.push('CDN_HEALTH_PATH must be an absolute path outside /dl (e.g. /health)');
  }

  const wh = bool(env.WEBHOOK_ENABLED, 'WEBHOOK_ENABLED', errs); if (wh !== undefined) cfg.webhook.enabled = wh;
  if (env.DISCORD_WEBHOOK_URL) cfg.webhook.discordUrl = env.DISCORD_WEBHOOK_URL;
  if (cfg.webhook.enabled) {
    if (!cfg.webhook.discordUrl) errs.push('WEBHOOK_ENABLED=true requires DISCORD_WEBHOOK_URL');
    else if (!/^https:\/\/(discord\.com|discordapp\.com)\/api\/webhooks\//.test(cfg.webhook.discordUrl)) errs.push('DISCORD_WEBHOOK_URL must be a Discord webhook URL (https://discord.com/api/webhooks/…)');
  }
  const whEvents = list(env.WEBHOOK_EVENTS);
  if (whEvents) {
    const bad = whEvents.filter((e) => !(WEBHOOK_EVENTS as string[]).includes(e));
    if (bad.length) errs.push(`WEBHOOK_EVENTS contains unknown events: ${bad.join(', ')} (valid: ${WEBHOOK_EVENTS.join(', ')})`);
    else cfg.webhook.events = whEvents as WebhookEvent[];
  }
  const whThrottle = int(env.WEBHOOK_THROTTLE_MS, 'WEBHOOK_THROTTLE_MS', 0, 3_600_000, errs); if (whThrottle !== undefined) cfg.webhook.throttleMs = whThrottle;
  if (env.WEBHOOK_USERNAME) cfg.webhook.username = env.WEBHOOK_USERNAME.slice(0, 80);

  const ttl = (name: string, key: keyof CDNConfig['cache']) => {
    const v = int(env[name], name, 0, 31_536_000 * 5, errs); if (v !== undefined) cfg.cache[key] = v;
  };
  ttl('CDN_CACHE_STATIC', 'staticAssets'); ttl('CDN_CACHE_MEDIA', 'mediaFiles');
  ttl('CDN_CACHE_DOCUMENTS', 'documents'); ttl('CDN_CACHE_TEXT', 'textFiles');

  if (errs.length) throw new Error(`Invalid configuration:\n - ${errs.join('\n - ')}`);
  return cfg;
}
