import { describe, expect, test } from 'bun:test';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseRange, etagMatches } from '../src/lib/range.js';
import { safeJoin, isInside, hasDotSegment } from '../src/lib/paths.js';
import { compareVersion, pickLatest } from '../src/lib/registry.js';
import { getConfig } from '../src/config.js';

describe('parseRange', () => {
  test('basic + open-ended', () => {
    expect(parseRange('bytes=0-4', 21)).toEqual({ kind: 'range', start: 0, end: 4 });
    expect(parseRange('bytes=5-', 21)).toEqual({ kind: 'range', start: 5, end: 20 });
  });
  test('suffix range (media-player seek) works', () => {
    expect(parseRange('bytes=-5', 21)).toEqual({ kind: 'range', start: 16, end: 20 });
    expect(parseRange('bytes=-100', 21)).toEqual({ kind: 'range', start: 0, end: 20 });
  });
  test('over-long end is clamped, never over-promised', () => {
    expect(parseRange('bytes=0-999999', 21)).toEqual({ kind: 'range', start: 0, end: 20 });
  });
  test('garbage is 416, never NaN/500', () => {
    for (const h of ['bytes=abc-def', 'bytes=', 'bytes=-', 'items=0-4', 'bytes=0-4,10-14', 'bytes=10-5', 'bytes=-0', 'bytes=99999999999999999999-']) {
      expect(parseRange(h, 21).kind).toBe('unsatisfiable');
    }
  });
  test('no header / empty file', () => {
    expect(parseRange(undefined, 21).kind).toBe('none');
    expect(parseRange('bytes=0-', 0).kind).toBe('unsatisfiable');
  });
});

describe('etagMatches', () => {
  const etag = '"abc-15"';
  test('exact, weak, list, star', () => {
    expect(etagMatches(etag, etag)).toBe(true);
    expect(etagMatches(`W/${etag}`, etag)).toBe(true);
    expect(etagMatches(`"x", ${etag}`, etag)).toBe(true);
    expect(etagMatches('*', etag)).toBe(true);
    expect(etagMatches('"other"', etag)).toBe(false);
    expect(etagMatches(undefined, etag)).toBe(false);
  });
});

describe('path containment', () => {
  const root = '/srv/public';
  test('normal joins', () => {
    expect(safeJoin(root, 'hello/test.txt')).toBe('/srv/public/hello/test.txt');
    expect(safeJoin(root, '/hello/test.txt')).toBe('/srv/public/hello/test.txt');
  });
  test('plain traversal rejected', () => {
    expect(safeJoin(root, '../outside/secret.txt')).toBeNull();
    expect(safeJoin(root, 'hello/../../outside/secret.txt')).toBeNull();
  });
  test('AUDIT C1: sibling-prefix traversal rejected', () => {
    expect(safeJoin(root, '../public-evil/secret.txt')).toBeNull();
    expect(isInside('/srv/public', '/srv/public-evil/x')).toBe(false);
    expect(isInside('/srv/public', '/srv/public/x')).toBe(true);
  });
  test('dot segments detected', () => {
    expect(hasDotSegment(root, '/srv/public/.env')).toBe(true);
    expect(hasDotSegment(root, '/srv/public/.git/config')).toBe(true);
    expect(hasDotSegment(root, '/srv/public/hello/test.txt')).toBe(false);
  });
});

describe('config', () => {
  test('AUDIT M5: defaults are not polluted between calls', () => {
    const a = getConfig({ CDN_LOG_LEVEL: 'debug', CDN_RATE_LIMIT_MAX: '7' } as NodeJS.ProcessEnv);
    expect(a.logging.level).toBe('debug');
    const b = getConfig({} as NodeJS.ProcessEnv);
    expect(b.logging.level).toBe('info');
    expect(b.rateLimit.maxRequests).toBe(1000);
  });
  test('AUDIT M6: invalid values rejected with a clear error', () => {
    expect(() => getConfig({ CDN_PORT: 'abc' } as NodeJS.ProcessEnv)).toThrow(/CDN_PORT/);
    expect(() => getConfig({ CDN_PORT: '99999' } as NodeJS.ProcessEnv)).toThrow(/CDN_PORT/);
    expect(() => getConfig({ CDN_LOG_LEVEL: 'banana' } as NodeJS.ProcessEnv)).toThrow(/CDN_LOG_LEVEL/);
    expect(() => getConfig({ CDN_CORS_CREDENTIALS: 'true', CDN_CORS_ORIGIN: '*' } as NodeJS.ProcessEnv)).toThrow(/CORS/);
    expect(() => getConfig({ WEBHOOK_ENABLED: 'true' } as NodeJS.ProcessEnv)).toThrow(/DISCORD_WEBHOOK_URL/);
  });
  test('fixture root sanity', () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'celecdn-test-'));
    expect(fs.existsSync(dir)).toBe(true);
    fs.rmSync(dir, { recursive: true, force: true });
  });
});

describe('versions', () => {
  test('semver-ish ordering', () => {
    expect(compareVersion('1.10.0', '1.9.0')).toBeGreaterThan(0);
    expect(compareVersion('v2.0.0', '1.9.9')).toBeGreaterThan(0);
    expect(pickLatest(['1.0.0', '1.2.0', '1.10.0'], null)).toBe('1.10.0');
  });
});
