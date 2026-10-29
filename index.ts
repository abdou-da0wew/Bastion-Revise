#!/usr/bin/env bun
/**
 * Bastion CDN entrypoint. Build with buildServer() (src/server.ts); this file
 * only owns process lifecycle: validated config, listen, graceful shutdown.
 */
import { buildServer } from './src/server.js';

const { fastify, config, webhook } = await buildServer().catch((err) => {
  console.error('Failed to start Bastion CDN:', err instanceof Error ? err.message : err);
  process.exit(1);
});

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  fastify.log.info({ signal }, 'shutting down gracefully (draining connections & streams)');
  const force = setTimeout(() => process.exit(1), 25_000).unref();
  try {
    await fastify.close();
    clearTimeout(force);
    process.exit(0);
  } catch (err) {
    fastify.log.error({ err }, 'error during shutdown');
    process.exit(1);
  }
}
process.on('SIGINT', () => void shutdown('SIGINT'));
process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('unhandledRejection', (err) => fastify.log.error({ err }, 'unhandled rejection'));
process.on('uncaughtException', (err) => {
  fastify.log.fatal({ err }, 'uncaught exception — shutting down');
  void shutdown('uncaughtException');
});

try {
  await fastify.listen({ port: config.port, host: config.host });
  fastify.log.info(`Bastion CDN listening on http://${config.host}:${config.port} (web root + /dl/ registry + /api)`);
  webhook.notify('server.start', '🚀 Bastion CDN started', `Listening on ${config.host}:${config.port}`, {
    webRoot: config.rootDirectory, packages: config.packageDirectory,
  });
} catch (err) {
  fastify.log.error({ err }, 'failed to bind/listen');
  webhook.notify('server.error', '🔥 Bastion CDN failed to start', String(err), {});
  process.exit(1);
}
