import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import Fastify, { type FastifyInstance, type FastifyReply, type FastifyRequest } from 'fastify';
import helmet from '@fastify/helmet';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import compress from '@fastify/compress';
import { getConfig, type CDNConfig } from './config.js';
import { hasDotSegment, isValidName, isValidVersion, safeJoin, HARD_BLOCKED_PACKAGE_EXT } from './lib/paths.js';
import { cacheTtlFor, serveFile, swr } from './lib/serve.js';
import { Registry } from './lib/registry.js';
import { TokenStore, isValidScopeList, type Scope } from './lib/tokens.js';
import { DiscordWebhook } from './lib/webhook.js';
import { metrics } from './lib/metrics.js';

export interface BuiltServer { fastify: FastifyInstance; config: CDNConfig; tokens: TokenStore; registry: Registry; webhook: DiscordWebhook }

const API_RATE = { config: { rateLimit: { max: 60, timeWindow: '1 minute' } } };

export async function buildServer(overrides?: Partial<CDNConfig>): Promise<BuiltServer> {
  const config: CDNConfig = { ...structuredClone(getConfig()), ...overrides };
  const rootDirectory = path.resolve(config.rootDirectory);
  const packageDirectory = path.resolve(config.packageDirectory);
  const dataDirectory = path.resolve(config.dataDirectory);
  for (const dir of [rootDirectory, packageDirectory, dataDirectory]) await fs.promises.mkdir(dir, { recursive: true });

  const tokens = new TokenStore(dataDirectory, config.security.adminToken);
  await tokens.load();
  const registry = new Registry(packageDirectory);

  const fastify = Fastify({
    logger: config.logging.enabled ? {
      level: config.logging.level,
      redact: ['req.headers.authorization', 'req.headers.cookie', 'req.headers["x-api-token"]'],
      transport: config.logging.prettyPrint ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss Z', ignore: 'pid,hostname' } } : undefined,
    } : false,
    trustProxy: config.rateLimit.trustProxy,
    routerOptions: { caseSensitive: true },
    exposeHeadRoutes: false,
    genReqId: (req) => {
      const incoming = req.headers['x-request-id'];
      return typeof incoming === 'string' && /^[A-Za-z0-9._-]{8,128}$/.test(incoming) ? incoming : crypto.randomUUID();
    },
    connectionTimeout: 10_000,
    keepAliveTimeout: 72_000,
    requestTimeout: 0, // long media streams are legitimate; bounded by stream gate + client disconnect handling
    bodyLimit: 1024 * 1024, // JSON APIs; uploads use the raw streaming route below
  });
  const webhook = new DiscordWebhook(config.webhook, fastify.log);

  // Raw-body uploads: hand the request stream straight to the registry writer
  // (constant-memory, hashed while streaming). JSON keeps Fastify's parser.
  fastify.addContentTypeParser('application/octet-stream', (_req, payload, done) => done(null, payload));
  fastify.addContentTypeParser('application/x-executable', (_req, payload, done) => done(null, payload));

  // Correlation id on every response + baseline request metrics.
  fastify.addHook('onSend', async (request, reply, payload) => {
    reply.header('x-request-id', request.id);
    const route = (request.routeOptions?.url ?? 'unknown').replace('/*', '/file');
    if (!reply.getHeader('x-metrics-counted')) metrics.requests.inc({ method: request.method, status: String(reply.statusCode), route });
    return payload;
  });

  if (config.security.helmet.enabled) {
    await fastify.register(helmet, {
      contentSecurityPolicy: config.security.helmet.contentSecurityPolicy ? {
        directives: {
          defaultSrc: ["'none'"], scriptSrc: ["'none'"], styleSrc: ["'none'"],
          imgSrc: ["'self'", 'data:'], mediaSrc: ["'self'"], fontSrc: ["'self'", 'data:'],
          connectSrc: ["'self'"], objectSrc: ["'none'"], frameSrc: ["'none'"], baseUri: ["'none'"], formAction: ["'none'"],
        },
      } : false,
      crossOriginEmbedderPolicy: false,
      // CDN assets must be embeddable cross-origin; API consumers use CORS fetch.
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      hsts: { maxAge: 31_536_000, includeSubDomains: true },
      noSniff: true,
      referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
      hidePoweredBy: true,
    });
  }
  if (config.security.cors.enabled) {
    const origins = config.security.cors.origins;
    await fastify.register(cors, {
      origin: origins === true || (Array.isArray(origins) && origins.includes('*')) && !config.security.cors.credentials ? true : origins,
      credentials: config.security.cors.credentials,
      methods: ['GET', 'HEAD', 'OPTIONS', 'PUT', 'POST', 'DELETE'],
      allowedHeaders: ['Range', 'If-None-Match', 'If-Modified-Since', 'If-Range', 'Cache-Control', 'Authorization', 'X-Api-Token', 'Content-Type', 'X-Request-Id'],
      exposedHeaders: ['Content-Length', 'Content-Type', 'Content-Range', 'Accept-Ranges', 'ETag', 'Cache-Control', 'X-Request-Id', 'X-Checksum-Sha256'],
      maxAge: config.security.cors.maxAge,
      optionsSuccessStatus: 204,
    });
  }
  if (config.compression.enabled) {
    await fastify.register(compress, { global: true, threshold: config.compression.threshold, encodings: ['br', 'gzip', 'deflate'] });
  }
  if (config.rateLimit.enabled) {
    await fastify.register(rateLimit, {
      max: config.rateLimit.maxRequests,
      timeWindow: config.rateLimit.timeWindow,
      cache: 10_000,
      allowList: (req) => config.healthCheck.enabled && req.url === config.healthCheck.path,
      skipOnError: false,
      addHeaders: { 'x-ratelimit-limit': true, 'x-ratelimit-remaining': true, 'x-ratelimit-reset': true, 'retry-after': true },
      errorResponseBuilder: (_req, context) => {
        webhook.notify('rate.limit', '🚦 Rate limit exceeded', `Limit ${context.max} per ${context.after}`, {});
        const e = new Error(`Rate limit exceeded. Try again in ${context.after}.`) as Error & { statusCode: number };
        e.statusCode = 429;
        return e;
      },
    });
  }

  // Bounded concurrent file streams (resource management).
  let activeGate = 0;
  const acquireStream = async () => activeGate < config.streaming.maxConcurrentStreams ? (activeGate++, true) : false;
  const releaseStream = () => { activeGate = Math.max(0, activeGate - 1); };

  const webExts = new Set(config.security.webAllowedExtensions);
  const pkgExts = new Set(config.security.packageAllowedExtensions.filter((e) => !HARD_BLOCKED_PACKAGE_EXT.has(e)));

  const auth = (scopes: Scope[]) => async (request: FastifyRequest, reply: FastifyReply) => {
    const header = request.headers.authorization;
    const presented = header?.startsWith('Bearer ') ? header.slice(7) : (request.headers['x-api-token'] as string | undefined);
    const who = tokens.authenticate(presented, scopes);
    if (!who) {
      metrics.authFailures.inc();
      webhook.notify('auth.failure', '🔐 API auth failure', `${request.method} ${request.url}`, { ip: request.ip, requestId: String(request.id) });
      return reply.code(401).header('WWW-Authenticate', 'Bearer').send({ error: 'Unauthorized', statusCode: 401 });
    }
    (request as FastifyRequest & { tokenWho?: unknown }).tokenWho = who;
  };

  /* ---------------------------------- ops ---------------------------------- */
  if (config.healthCheck.enabled) {
    fastify.get(config.healthCheck.path, async (_req, reply) => reply.code(200).header('Cache-Control', 'no-store').send({ status: 'ok' }));
    fastify.get('/ready', async (_req, reply) => {
      const checks: Record<string, boolean> = {};
      for (const [name, dir] of [['root', rootDirectory], ['packages', packageDirectory], ['data', dataDirectory]] as const) {
        checks[name] = await fs.promises.access(dir, fs.constants.R_OK).then(() => true).catch(() => false);
      }
      const ok = Object.values(checks).every(Boolean);
      return reply.code(ok ? 200 : 503).header('Cache-Control', 'no-store').send({ status: ok ? 'ready' : 'not-ready', checks });
    });
  }
  if (config.metrics.enabled) {
    fastify.get('/metrics', { preHandler: config.metrics.public ? undefined : auth(['admin', 'read']) }, async (_req, reply) =>
      reply.code(200).header('Content-Type', 'text/plain; version=0.0.4; charset=utf-8').header('Cache-Control', 'no-store').send(metrics.render()));
  }

  /* ------------------------------ /dl registry ------------------------------ */
  const dlCache = (version: string) => version === 'latest'
    ? 'public, max-age=300, stale-while-revalidate=30'
    : 'public, max-age=31536000, immutable'; // pinned versions never change under a name; re-uploads get a new version

  const dlHandler = (headOnly: boolean) => async (request: FastifyRequest, reply: FastifyReply) => {
    const { name, version, file } = request.params as { name: string; version: string; file: string };
    if (!isValidName(name) || !isValidVersion(version) || !isValidName(file) || file.startsWith('.')) {
      return reply.code(404).send({ error: 'Not Found', statusCode: 404 });
    }
    const manifest = await registry.manifest(name);
    if (!manifest) return reply.code(404).send({ error: 'Not Found', statusCode: 404 });
    const resolvedVersion = registry.resolveVersion(manifest, version);
    if (!resolvedVersion) return reply.code(404).send({ error: 'Not Found', statusCode: 404 });
    const entry = manifest.versions[resolvedVersion]?.files[file];
    const candidate = registry.filePath(name, resolvedVersion, file);
    if (!candidate) return reply.code(404).send({ error: 'Not Found', statusCode: 404 });
    return serveFile(request, reply, {
      root: packageDirectory, candidate, allowedExtensions: pkgExts,
      maxFileSize: config.security.maxFileSize, cacheControl: dlCache(version),
      disposition: 'attachment', contentSha256: entry?.sha256, area: 'dl',
      headOnly, rangeEnabled: config.streaming.rangeEnabled, acquireStream, releaseStream,
    });
  };
  fastify.get('/dl/:name/:version/:file', dlHandler(false));
  fastify.head('/dl/:name/:version/:file', dlHandler(true));
  fastify.get('/dl/:name/:version', async (request, reply) => {
    const { name, version } = request.params as { name: string; version: string };
    if (!isValidName(name) || !isValidVersion(version)) return reply.code(404).send({ error: 'Not Found', statusCode: 404 });
    const m = await registry.manifest(name);
    const v = m && registry.resolveVersion(m, version);
    if (!m || !v) return reply.code(404).send({ error: 'Not Found', statusCode: 404 });
    return reply.header('Cache-Control', 'public, max-age=60').send({ name, version: v, files: m.versions[v].files });
  });
  fastify.get('/dl/:name', async (request, reply) => {
    const { name } = request.params as { name: string };
    if (!isValidName(name)) return reply.code(404).send({ error: 'Not Found', statusCode: 404 });
    const m = await registry.manifest(name);
    if (!m) return reply.code(404).send({ error: 'Not Found', statusCode: 404 });
    return reply.header('Cache-Control', 'public, max-age=60').send(m);
  });
  fastify.get('/dl', async (_req, reply) => reply.header('Cache-Control', 'public, max-age=60').send({ packages: (await registry.listPackages()).map((p) => ({ name: p.name, latest: p.latest, versions: Object.keys(p.versions) })) }));

  /* --------------------------------- API ----------------------------------- */
  if (config.security.apiEnabled) {
    fastify.get('/api/files', { preHandler: auth(['read', 'manage', 'upload']) }, async (_req, reply) =>
      reply.header('Cache-Control', 'no-store').send({ packages: await registry.listPackages() }));

    fastify.put('/api/files/:name/:version/:file', {
      preHandler: auth(['upload']), config: { rateLimit: { max: config.rateLimit.authMaxRequests, timeWindow: '1 minute' } },
    }, async (request, reply) => {
      const { name, version, file } = request.params as { name: string; version: string; file: string };
      if (!isValidName(name) || !isValidVersion(version) || version === 'latest' || !isValidName(file) || file.startsWith('.')) {
        return reply.code(400).send({ error: 'Invalid package/version/file name', statusCode: 400 });
      }
      const ext = path.extname(file).toLowerCase();
      const compound = file.toLowerCase().endsWith('.tar.gz') ? '.tar.gz' : ext;
      if (!pkgExts.has(ext) && !pkgExts.has(compound)) return reply.code(415).send({ error: 'File type not allowed in registry', statusCode: 415 });
      try {
        const { entry } = await registry.store(name, version, file, request.raw, config.security.maxUploadSize);
        metrics.uploads.inc({ result: 'ok' });
        webhook.notify('upload', '📦 Package file uploaded', `${name}@${version}/${file}`, { size: String(entry.size), sha256: entry.sha256.slice(0, 16) + '…', requestId: String(request.id) });
        return reply.code(201).header('Cache-Control', 'no-store').send({
          name, version, file, size: entry.size, sha256: entry.sha256,
          url: `/dl/${name}/${version}/${file}`, latestUrl: `/dl/${name}/latest/${file}`,
        });
      } catch (err) {
        metrics.uploads.inc({ result: 'error' });
        throw err;
      }
    });

    fastify.post('/api/files/:name/:version/latest', { preHandler: auth(['manage']), ...API_RATE }, async (request, reply) => {
      const { name, version } = request.params as { name: string; version: string };
      if (!isValidName(name) || !isValidVersion(version) || !(await registry.setLatest(name, version))) {
        return reply.code(404).send({ error: 'Not Found', statusCode: 404 });
      }
      return reply.send({ name, latest: version });
    });

    fastify.delete('/api/files/:name/:version/:file', { preHandler: auth(['manage']), ...API_RATE }, async (request, reply) => {
      const { name, version, file } = request.params as { name: string; version: string; file: string };
      const ok = isValidName(name) && isValidVersion(version) && isValidName(file) && await registry.remove(name, version, file);
      if (ok) webhook.notify('file.delete', '🗑️ Package file deleted', `${name}@${version}/${file}`, { requestId: String(request.id) });
      return reply.code(ok ? 204 : 404).send(ok ? undefined : { error: 'Not Found', statusCode: 404 });
    });
    fastify.delete('/api/files/:name/:version', { preHandler: auth(['manage']), ...API_RATE }, async (request, reply) => {
      const { name, version } = request.params as { name: string; version: string };
      const ok = isValidName(name) && isValidVersion(version) && await registry.remove(name, version);
      return reply.code(ok ? 204 : 404).send(ok ? undefined : { error: 'Not Found', statusCode: 404 });
    });
    fastify.delete('/api/files/:name', { preHandler: auth(['manage']), ...API_RATE }, async (request, reply) => {
      const { name } = request.params as { name: string };
      const ok = isValidName(name) && await registry.remove(name);
      return reply.code(ok ? 204 : 404).send(ok ? undefined : { error: 'Not Found', statusCode: 404 });
    });

    // Token lifecycle — admin only (bootstrap CDN_ADMIN_TOKEN counts as admin).
    fastify.get('/api/tokens', { preHandler: auth(['admin']), ...API_RATE }, async (_req, reply) =>
      reply.header('Cache-Control', 'no-store').send({ tokens: tokens.list() }));
    fastify.post('/api/tokens', { preHandler: auth(['admin']), ...API_RATE }, async (request, reply) => {
      const body = (request.body ?? {}) as { label?: unknown; scopes?: unknown };
      if (!isValidScopeList(body.scopes)) return reply.code(400).send({ error: 'scopes must be a non-empty subset of admin|upload|manage|read', statusCode: 400 });
      const { token, record } = await tokens.create(typeof body.label === 'string' ? body.label : 'untitled', body.scopes);
      webhook.notify('token.create', '🔑 API token created', record.label, { id: record.id, scopes: record.scopes.join(','), requestId: String(request.id) });
      return reply.code(201).header('Cache-Control', 'no-store').send({ token, ...record, warning: 'Store this token now — it is shown only once.' });
    });
    fastify.delete('/api/tokens/:id', { preHandler: auth(['admin']), ...API_RATE }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const ok = await tokens.revoke(id);
      if (ok) webhook.notify('token.revoke', '🔑 API token revoked', id, { requestId: String(request.id) });
      return reply.code(ok ? 204 : 404).send(ok ? undefined : { error: 'Not Found', statusCode: 404 });
    });
    fastify.post('/api/tokens/:id/revoke', { preHandler: auth(['admin']), ...API_RATE }, async (request, reply) => {
      const { id } = request.params as { id: string };
      const ok = await tokens.revoke(id);
      return reply.code(ok ? 200 : 404).send(ok ? { id, revoked: true } : { error: 'Not Found', statusCode: 404 });
    });
  }

  /* ------------------------------ web root --------------------------------- */
  const webHandler = (headOnly: boolean) => async (request: FastifyRequest, reply: FastifyReply) => {
    const requestPath = (request.params as Record<string, string>)['*'] ?? '';
    if (!requestPath) {
      if (headOnly) return reply.code(404).send({ error: 'Not Found', statusCode: 404 });
      return reply.code(200).header('Cache-Control', 'no-store').send({
        name: 'CeleCDN', status: 'running',
        message: 'Files: /<path> • Versioned packages: /dl/<name>/<version>/<file> • API docs: /docs',
        requestId: request.id,
      });
    }
    const candidate = safeJoin(rootDirectory, requestPath);
    if (!candidate || hasDotSegment(rootDirectory, candidate)) return reply.code(404).send({ error: 'Not Found', statusCode: 404 });
    const ttl = cacheTtlFor(candidate, config.cache);
    return serveFile(request, reply, {
      root: rootDirectory, candidate, allowedExtensions: webExts,
      maxFileSize: config.security.maxFileSize,
      cacheControl: `public, max-age=${ttl}, stale-while-revalidate=${swr(ttl)}`,
      disposition: 'inline', area: 'web', headOnly,
      rangeEnabled: config.streaming.rangeEnabled, acquireStream, releaseStream,
    });
  };
  fastify.get('/*', webHandler(false));
  fastify.head('/*', webHandler(true));

  fastify.setNotFoundHandler(async (_req, reply) => reply.code(404).header('Cache-Control', 'no-store').send({ error: 'Not Found', statusCode: 404 }));
  fastify.setErrorHandler((error, request, reply) => {
    const status = typeof (error as { statusCode?: unknown }).statusCode === 'number' ? (error as { statusCode: number }).statusCode : 500;
    if (status >= 500) {
      fastify.log.error({ err: error, reqId: request.id }, 'request error');
      webhook.notify('server.error', '🔥 CeleCDN server error', `${request.method} ${request.url}`, { status: String(status), requestId: String(request.id) });
    }
    // Never leak internals: generic message + correlation id only.
    return reply.code(status).header('Cache-Control', 'no-store').send({
      error: status >= 500 ? 'Internal Server Error' : (error as Error).message,
      statusCode: status, requestId: request.id,
    });
  });

  return { fastify, config, tokens, registry, webhook };
}
