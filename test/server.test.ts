import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { buildServer, type BuiltServer } from '../src/server.js';

let built: BuiltServer;
let base: string;
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'celecdn-it-'));
const webRoot = path.join(tmp, 'root');
const pkgDir = path.join(tmp, 'packages');
const dataDir = path.join(tmp, 'data');
const sibling = path.join(tmp, 'root-evil');
const outside = path.join(tmp, 'outside');

beforeAll(async () => {
  fs.mkdirSync(path.join(webRoot, 'hello'), { recursive: true });
  fs.mkdirSync(sibling, { recursive: true });
  fs.mkdirSync(outside, { recursive: true });
  fs.writeFileSync(path.join(webRoot, 'hello/test.txt'), 'hello world0123456789');
  fs.writeFileSync(path.join(webRoot, '.env'), 'DOTENV_SECRET=nope');
  fs.writeFileSync(path.join(webRoot, 'key.pem'), 'PEM_NOPE');
  fs.writeFileSync(path.join(sibling, 'secret.txt'), 'SIBLING_SECRET');
  fs.writeFileSync(path.join(outside, 'secret.txt'), 'OUTSIDE_SECRET');
  fs.symlinkSync(path.join(outside, 'secret.txt'), path.join(webRoot, 'link.txt'));
  process.env.CDN_ADMIN_TOKEN = 'test-admin-token';
  built = await buildServer({
    rootDirectory: webRoot, packageDirectory: pkgDir, dataDirectory: dataDir,
    logging: { enabled: false, level: 'silent', prettyPrint: false },
    security: { ...structuredClone((await import('../src/config.js')).defaultConfig.security), adminToken: 'test-admin-token', apiEnabled: true },
  } as never);
  await built.fastify.listen({ port: 0, host: '127.0.0.1' });
  const addr = built.fastify.server.address();
  base = `http://127.0.0.1:${typeof addr === 'object' && addr ? addr.port : 0}`;
});
afterAll(async () => { await built.fastify.close(); fs.rmSync(tmp, { recursive: true, force: true }); });

const f = (p: string, init?: RequestInit) => fetch(`${base}${p}`, init);
const ADMIN = { authorization: 'Bearer test-admin-token' };

describe('security regressions (from AUDIT.md)', () => {
  test('C1 sibling-prefix traversal → 404', async () => {
    expect((await f('/%2e%2e/root-evil/secret.txt')).status).toBe(404);
  });
  test('C2 symlink escape → 404', async () => {
    const r = await f('/link.txt');
    expect(r.status).toBe(404);
    expect(await r.text()).not.toContain('OUTSIDE_SECRET');
  });
  test('C3 dotfile .env → 404, secret extensions not in allowlist → 404', async () => {
    expect((await f('/.env')).status).toBe(404);
    expect((await f('/key.pem')).status).toBe(404);
  });
  test('plain file still served', async () => {
    const r = await f('/hello/test.txt');
    expect(r.status).toBe(200);
    expect(await r.text()).toBe('hello world0123456789');
    expect(r.headers.get('x-request-id')).toBeTruthy();
  });
});

describe('range & conditionals', () => {
  test('suffix range works; garbage range is 416 not 500', async () => {
    const suffix = await f('/hello/test.txt', { headers: { range: 'bytes=-5' } });
    expect(suffix.status).toBe(206);
    expect(await suffix.text()).toBe('56789');
    expect((await f('/hello/test.txt', { headers: { range: 'bytes=abc-def' } })).status).toBe(416);
    expect((await f('/hello/test.txt', { headers: { range: 'bytes=10-5' } })).status).toBe(416);
    expect((await f('/hello/test.txt', { headers: { range: 'bytes=0-4,10-14' } })).status).toBe(416);
  });
  test('over-long range is clamped and completes', async () => {
    const r = await f('/hello/test.txt', { headers: { range: 'bytes=0-999999' } });
    expect(r.status).toBe(206);
    expect(r.headers.get('content-length')).toBe('21');
    expect(await r.text()).toBe('hello world0123456789');
  });
  test('ETag: star / list / weak all yield 304; If-Range honoured', async () => {
    const first = await f('/hello/test.txt');
    const etag = first.headers.get('etag')!;
    expect((await f('/hello/test.txt', { headers: { 'if-none-match': '*' } })).status).toBe(304);
    expect((await f('/hello/test.txt', { headers: { 'if-none-match': `"x", ${etag}` } })).status).toBe(304);
    expect((await f('/hello/test.txt', { headers: { 'if-none-match': `W/${etag}` } })).status).toBe(304);
    expect((await f('/hello/test.txt', { headers: { 'if-none-match': '"wrong"', 'if-modified-since': 'Wed, 01 Jan 2030 00:00:00 GMT' } })).status).toBe(200);
    const stale = await f('/hello/test.txt', { headers: { range: 'bytes=0-4', 'if-range': '"stale"' } });
    expect(stale.status).toBe(200);
    expect(await stale.text()).toBe('hello world0123456789');
  });
  test('compression negotiates gzip for text', async () => {
    fs.writeFileSync(path.join(webRoot, 'big.txt'), 'x'.repeat(5000));
    const r = await fetch(`${base}/big.txt`, { headers: { 'accept-encoding': 'gzip' } });
    expect(r.headers.get('content-encoding')).toBe('gzip');
  });
});

describe('ops endpoints', () => {
  test('health is minimal; ready works; metrics requires admin by default', async () => {
    const h = await (await f('/health')).json() as Record<string, unknown>;
    expect(h).toEqual({ status: 'ok' });
    expect((await f('/ready')).status).toBe(200);
    expect((await f('/metrics')).status).toBe(401);
    const m = await f('/metrics', { headers: ADMIN });
    expect(m.status).toBe(200);
    expect(await m.text()).toContain('bastion_http_requests_total');
  });
  test('unsupported method is not a fake file-404 contract', async () => {
    expect((await f('/hello/test.txt', { method: 'POST' })).status).toBe(404);
  });
});

describe('token API + /dl registry', () => {
  let uploadToken = '';
  test('unauthenticated API → 401', async () => {
    expect((await f('/api/files')).status).toBe(401);
    expect((await f('/api/tokens', { headers: ADMIN })).status).toBe(200);
  });
  test('create scoped token (shown once), use it, revoke it', async () => {
    const created = await f('/api/tokens', { method: 'POST', headers: { ...ADMIN, 'content-type': 'application/json' }, body: JSON.stringify({ label: 'ci', scopes: ['upload', 'read'] }) });
    expect(created.status).toBe(201);
    const body = await created.json() as { token: string; id: string };
    uploadToken = body.token;
    expect(uploadToken.startsWith('bastion_')).toBe(true);
    const list = await (await f('/api/tokens', { headers: ADMIN })).json() as { tokens: Array<Record<string, unknown>> };
    expect(JSON.stringify(list)).not.toContain(uploadToken); // hash-only storage, never re-displayed
    const revoke = await f(`/api/tokens/${body.id}/revoke`, { method: 'POST', headers: ADMIN });
    expect(revoke.status).toBe(200);
    expect((await f('/api/files', { headers: { authorization: `Bearer ${uploadToken}` } })).status).toBe(401);
  });
  test('upload → serve via /dl (versioned, latest, sha256, attachment)', async () => {
    const created = await f('/api/tokens', { method: 'POST', headers: { ...ADMIN, 'content-type': 'application/json' }, body: JSON.stringify({ label: 'ci2', scopes: ['upload', 'read', 'manage'] }) });
    const { token } = await created.json() as { token: string };
    const auth = { authorization: `Bearer ${token}` };
    const payload = '#!/bin/sh\necho hello-celecdn\n';
    const up = await f('/api/files/mytool/1.2.3/mytool.sh', { method: 'PUT', headers: { ...auth, 'content-type': 'application/octet-stream' }, body: payload });
    expect(up.status).toBe(201);
    const upBody = await up.json() as { sha256: string; url: string };
    expect(upBody.sha256).toHaveLength(64);

    const served = await f(upBody.url);
    expect(served.status).toBe(200);
    expect(await served.text()).toBe(payload);
    expect(served.headers.get('content-disposition')).toContain('attachment');
    const latest = await f('/dl/mytool/latest/mytool.sh');
    expect(latest.status).toBe(200);
    const manifest = await (await f('/dl/mytool')).json() as { latest: string };
    expect(manifest.latest).toBe('1.2.3');
    const ranged = await f(upBody.url, { headers: { range: 'bytes=0-9' } });
    expect(ranged.status).toBe(206);
    expect((await f('/dl/mytool/9.9.9/mytool.sh')).status).toBe(404);
    expect((await f('/api/files', { headers: auth })).status).toBe(200);
    expect((await f('/api/files/mytool/1.2.3/mytool.sh', { method: 'DELETE', headers: auth })).status).toBe(204);
    expect((await f(upBody.url)).status).toBe(404);
  });
  test('registry rejects traversal-ish names and blocked types', async () => {
    const created = await f('/api/tokens', { method: 'POST', headers: { ...ADMIN, 'content-type': 'application/json' }, body: JSON.stringify({ label: 'ci3', scopes: ['upload'] }) });
    const { token } = await created.json() as { token: string };
    const auth = { authorization: `Bearer ${token}`, 'content-type': 'application/octet-stream' };
    expect((await f('/api/files/bad/1.0.0/secret.pem', { method: 'PUT', headers: auth, body: 'x' })).status).toBe(415);
    expect((await f('/api/files/bad/latest/x.sh', { method: 'PUT', headers: auth, body: 'x' })).status).toBe(400);
  });
});
