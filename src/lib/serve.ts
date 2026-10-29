import fs from 'node:fs';
import path from 'node:path';
import type { FastifyReply, FastifyRequest } from 'fastify';
import mime from 'mime-types';
import { etagMatches, parseHttpDate, parseRange } from './range.js';
import { realFileInside } from './paths.js';
import { metrics } from './metrics.js';

export interface ServeOptions {
  root: string;
  /** Candidate absolute path (already lexically joined). */
  candidate: string;
  allowedExtensions: Set<string>;
  maxFileSize: number;
  cacheControl: string;
  disposition: 'inline' | 'attachment';
  /** Strong content hash (sha256 hex) when known from a manifest — skips the mtime validator. */
  contentSha256?: string;
  area: 'web' | 'dl';
  headOnly: boolean;
  rangeEnabled: boolean;
  acquireStream: () => Promise<boolean>;
  releaseStream: () => void;
}

const one = (v: string | string[] | undefined): string | undefined => (Array.isArray(v) ? v[0] : v);
const STATIC_EXT = new Set('css js mjs woff woff2 ttf otf eot svg ico png jpg jpeg gif webp avif'.split(' '));
const MEDIA_EXT = new Set('mp3 mp4 wav ogg m4a flac aac webm mov avi mkv'.split(' '));
const DOC_EXT = new Set('pdf doc docx xls xlsx ppt pptx odt ods odp'.split(' '));
const TEXT_EXT = new Set('txt json xml html md csv'.split(' '));
export function cacheTtlFor(filename: string, cache: { staticAssets: number; mediaFiles: number; documents: number; textFiles: number; default: number }): number {
  const ext = path.extname(filename).toLowerCase().slice(1);
  if (STATIC_EXT.has(ext)) return cache.staticAssets;
  if (MEDIA_EXT.has(ext)) return cache.mediaFiles;
  if (DOC_EXT.has(ext)) return cache.documents;
  if (TEXT_EXT.has(ext)) return cache.textFiles;
  return cache.default;
}
export const swr = (ttl: number) => Math.floor(ttl * 0.1);

function err(reply: FastifyReply, status: number, message: string) {
  return reply.code(status).header('Cache-Control', 'no-store').send({ error: message, statusCode: status });
}

/**
 * One shared, correct sender for web + /dl/ GET and HEAD.
 * Fixes from the audit: realpath containment, dotfile deny, conditional
 * requests evaluated BEFORE Range with weak comparison + If-Range, clamped
 * single-range parsing, one stat from an open handle, stream cleanup on
 * client disconnect, and a concurrency gate.
 */
export async function serveFile(request: FastifyRequest, reply: FastifyReply, opts: ServeOptions): Promise<FastifyReply> {
  const found = await realFileInside(opts.root, opts.candidate);
  if (!found) return err(reply, 404, 'Not Found');
  const { realPath, stat } = found;

  const ext = path.extname(realPath).toLowerCase();
  // Compound extensions (x.tar.gz) are judged by their full known suffix.
  const compound = realPath.toLowerCase().endsWith('.tar.gz') ? '.tar.gz' : ext;
  if (!opts.allowedExtensions.has(ext) && !opts.allowedExtensions.has(compound)) return err(reply, 404, 'Not Found');
  if (opts.maxFileSize > 0 && stat.size > opts.maxFileSize) return err(reply, 413, 'File exceeds maximum size limit');

  const etag = opts.contentSha256 ? `"sha256-${opts.contentSha256}"` : `"${stat.size.toString(16)}-${Math.floor(stat.mtimeMs).toString(16)}"`;
  const mimeType = mime.lookup(realPath) || 'application/octet-stream';
  const baseHeaders = {
    'Content-Type': mimeType,
    'Accept-Ranges': 'bytes',
    ETag: etag,
    'Last-Modified': stat.mtime.toUTCString(),
    'Cache-Control': opts.cacheControl,
    'X-Content-Type-Options': 'nosniff',
    'Content-Disposition': `${opts.disposition}; filename="${path.basename(realPath).replace(/["\\]/g, '_')}"`,
  };

  // Conditional requests (RFC 9110 §13): If-None-Match first, and it suppresses If-Modified-Since.
  const inm = one(request.headers['if-none-match']);
  if (inm !== undefined) {
    if (etagMatches(inm, etag)) {
      return reply.code(304).headers({ ETag: etag, 'Cache-Control': opts.cacheControl, 'Last-Modified': stat.mtime.toUTCString() }).send();
    }
  } else {
    const ims = parseHttpDate(one(request.headers['if-modified-since']));
    // HTTP dates have 1s resolution — compare at second granularity.
    if (ims !== null && Math.floor(stat.mtimeMs / 1000) <= Math.floor(ims / 1000)) {
      return reply.code(304).headers({ ETag: etag, 'Cache-Control': opts.cacheControl, 'Last-Modified': stat.mtime.toUTCString() }).send();
    }
  }

  // Range (only honoured when If-Range, if present, matches).
  let rangeHeader = opts.rangeEnabled ? one(request.headers.range) : undefined;
  const ifRange = one(request.headers['if-range']);
  if (rangeHeader && ifRange !== undefined && !etagMatches(ifRange, etag)) {
    const d = parseHttpDate(ifRange);
    if (d === null || Math.floor(stat.mtimeMs / 1000) > Math.floor(d / 1000)) rangeHeader = undefined;
  }

  const parsed = parseRange(rangeHeader, stat.size);
  if (parsed.kind === 'unsatisfiable') {
    metrics.rangeRequests.inc({ outcome: '416' });
    return reply.code(416).headers({ ...baseHeaders, 'Content-Range': `bytes */${stat.size}` }).type('application/json').send({ error: 'Requested Range Not Satisfiable', statusCode: 416 });
  }

  const start = parsed.kind === 'range' ? parsed.start : 0;
  const end = parsed.kind === 'range' ? parsed.end : stat.size - 1;
  const length = stat.size === 0 ? 0 : end - start + 1;
  const status = parsed.kind === 'range' ? 206 : 200;
  metrics.rangeRequests.inc({ outcome: parsed.kind === 'range' ? '206' : 'none' });

  if (opts.headOnly || stat.size === 0) {
    return reply.code(status).headers({
      ...baseHeaders,
      'Content-Length': String(length),
      ...(parsed.kind === 'range' ? { 'Content-Range': `bytes ${start}-${end}/${stat.size}` } : {}),
    }).send();
  }

  if (!(await opts.acquireStream())) return err(reply, 503, 'Server busy: too many concurrent streams');

  let handle: fs.promises.FileHandle;
  try {
    handle = await fs.promises.open(realPath, 'r');
  } catch {
    opts.releaseStream();
    return err(reply, 404, 'Not Found');
  }
  const stream = handle.createReadStream({ start, end: stat.size === 0 ? undefined : end, autoClose: true });
  metrics.activeStreams.value++;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    metrics.activeStreams.value = Math.max(0, metrics.activeStreams.value - 1);
    opts.releaseStream();
  };
  stream.on('error', (e) => {
    request.log.warn({ err: e }, 'file stream error');
    release();
    if (!reply.raw.headersSent) reply.code(500).send({ error: 'Internal Server Error', statusCode: 500 });
    else reply.raw.destroy();
  });
  request.raw.on('close', () => { if (!stream.destroyed && !reply.raw.writableEnded) stream.destroy(); });
  stream.on('close', release);

  metrics.bytesServed.inc({ area: opts.area }, length);
  return reply.code(status).headers({
    ...baseHeaders,
    'Content-Length': String(length),
    ...(parsed.kind === 'range' ? { 'Content-Range': `bytes ${start}-${end}/${stat.size}` } : {}),
  }).send(stream);
}
