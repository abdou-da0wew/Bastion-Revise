import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { isInside } from './paths.js';

export interface FileEntry { size: number; sha256: string; contentType: string | null; uploadedAt: string }
export interface PackageManifest {
  name: string;
  latest: string | null;
  versions: Record<string, { createdAt: string; files: Record<string, FileEntry> }>;
}

const emptyManifest = (name: string): PackageManifest => ({ name, latest: null, versions: {} });

/** On-disk layout: <pkgDir>/<name>/manifest.json and <pkgDir>/<name>/<version>/<file>. */
export class Registry {
  constructor(readonly dir: string) {}

  private manifestPath(name: string) { return path.join(this.dir, name, 'manifest.json'); }

  async manifest(name: string): Promise<PackageManifest | null> {
    try {
      const raw = await fs.promises.readFile(this.manifestPath(name), 'utf8');
      const parsed = JSON.parse(raw) as PackageManifest;
      return parsed && typeof parsed === 'object' && parsed.versions ? parsed : null;
    } catch { return null; }
  }

  private async saveManifest(m: PackageManifest): Promise<void> {
    const file = this.manifestPath(m.name);
    await fs.promises.mkdir(path.dirname(file), { recursive: true });
    const tmp = `${file}.${process.pid}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(m, null, 2));
    await fs.promises.rename(tmp, file);
  }

  async listPackages(): Promise<PackageManifest[]> {
    let names: string[] = [];
    try { names = (await fs.promises.readdir(this.dir, { withFileTypes: true })).filter((d) => d.isDirectory()).map((d) => d.name); }
    catch { return []; }
    const out = await Promise.all(names.map((n) => this.manifest(n)));
    return out.filter((m): m is PackageManifest => m !== null);
  }

  resolveVersion(m: PackageManifest, version: string): string | null {
    if (version === 'latest') return m.latest;
    return m.versions[version] ? version : null;
  }

  filePath(name: string, version: string, filename: string): string | null {
    const p = path.resolve(this.dir, name, version, filename);
    return isInside(path.resolve(this.dir), p) ? p : null;
  }

  /**
   * Stream an upload to disk: temp file in the target dir → sha256 while
   * streaming → fsync → atomic rename → manifest update. Never buffers the
   * whole file in memory and never leaves a partial file servable.
   */
  async store(name: string, version: string, filename: string, source: NodeJS.ReadableStream, maxBytes: number):
    Promise<{ entry: FileEntry; path: string }> {
    const dest = this.filePath(name, version, filename);
    if (!dest) throw Object.assign(new Error('Invalid path'), { statusCode: 400 });
    await fs.promises.mkdir(path.dirname(dest), { recursive: true });
    const tmp = `${dest}.upload-${crypto.randomUUID()}`;
    const hash = crypto.createHash('sha256');
    let size = 0;
    const out = fs.createWriteStream(tmp, { mode: 0o644 });
    try {
      for await (const chunk of source as AsyncIterable<Buffer>) {
        size += chunk.length;
        if (size > maxBytes) throw Object.assign(new Error(`Upload exceeds ${maxBytes} bytes`), { statusCode: 413 });
        hash.update(chunk);
        if (!out.write(chunk)) await new Promise<void>((r) => out.once('drain', r));
      }
      await new Promise<void>((resolve, reject) => { out.end((e?: Error | null) => (e ? reject(e) : resolve())); });
      const handle = await fs.promises.open(tmp, 'r');
      await handle.sync(); await handle.close();
      await fs.promises.rename(tmp, dest);
    } catch (err) {
      out.destroy();
      await fs.promises.rm(tmp, { force: true }).catch(() => undefined);
      throw err;
    }
    const entry: FileEntry = { size, sha256: hash.digest('hex'), contentType: null, uploadedAt: new Date().toISOString() };
    const m = (await this.manifest(name)) ?? emptyManifest(name);
    m.versions[version] ??= { createdAt: new Date().toISOString(), files: {} };
    m.versions[version].files[filename] = entry;
    if (!m.latest || m.latest === version) m.latest = version;
    // Explicitly publishing an older version must not steal `latest` from a newer one:
    m.latest = pickLatest(Object.keys(m.versions), m.latest);
    await this.saveManifest(m);
    return { entry, path: dest };
  }

  async setLatest(name: string, version: string): Promise<boolean> {
    const m = await this.manifest(name);
    if (!m || !m.versions[version]) return false;
    m.latest = version;
    await this.saveManifest(m);
    return true;
  }

  async remove(name: string, version?: string, filename?: string): Promise<boolean> {
    const m = await this.manifest(name);
    if (!m) return false;
    if (version && filename) {
      const p = this.filePath(name, version, filename);
      if (p) await fs.promises.rm(p, { force: true });
      delete m.versions[version]?.files[filename];
      if (m.versions[version] && Object.keys(m.versions[version].files).length === 0) delete m.versions[version];
    } else if (version) {
      await fs.promises.rm(path.join(this.dir, name, version), { recursive: true, force: true });
      delete m.versions[version];
    } else {
      await fs.promises.rm(path.join(this.dir, name), { recursive: true, force: true });
      await fs.promises.rm(this.manifestPath(name), { force: true }).catch(() => undefined);
      return true;
    }
    if (m.latest && !m.versions[m.latest]) m.latest = pickLatest(Object.keys(m.versions), null);
    if (Object.keys(m.versions).length === 0) {
      await fs.promises.rm(path.join(this.dir, name), { recursive: true, force: true }).catch(() => undefined);
      return true;
    }
    await this.saveManifest(m);
    return true;
  }
}

/** Crude but deterministic "newest version" pick: semver compare when possible, else lexical. */
export function pickLatest(versions: string[], current: string | null): string | null {
  if (!versions.length) return null;
  if (current && versions.includes(current)) {
    // Keep the explicitly/newly published pointer unless a strictly greater semver exists.
    const greater = versions.filter((v) => compareVersion(v, current) > 0);
    return greater.length ? greater.sort(compareVersion).at(-1)! : current;
  }
  return [...versions].sort(compareVersion).at(-1)!;
}
export function compareVersion(a: string, b: string): number {
  const pa = a.replace(/^v/, '').split(/[.-]/);
  const pb = b.replace(/^v/, '').split(/[.-]/);
  for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
    const x = pa[i] ?? '0'; const y = pb[i] ?? '0';
    const nx = Number(x); const ny = Number(y);
    if (Number.isInteger(nx) && Number.isInteger(ny) && String(nx) === x && String(ny) === y) {
      if (nx !== ny) return nx - ny;
    } else if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
}
export const sha256Hex = (buf: Buffer | string) => crypto.createHash('sha256').update(buf).digest('hex');
