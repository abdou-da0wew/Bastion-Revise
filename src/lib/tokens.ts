import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';

export type Scope = 'admin' | 'upload' | 'manage' | 'read';
export const SCOPES: Scope[] = ['admin', 'upload', 'manage', 'read'];

export interface StoredToken {
  id: string;
  label: string;
  /** sha256 hex of the plaintext — plaintext is shown exactly once at creation. */
  hash: string;
  prefix: string;
  scopes: Scope[];
  createdAt: string;
  revokedAt: string | null;
  lastUsedAt: string | null;
}
export interface PublicToken extends Omit<StoredToken, 'hash'> {}

const hashOf = (token: string) => crypto.createHash('sha256').update(token).digest('hex');
export const tokenHash = hashOf;

export function generateToken(): string {
  return `cele_${crypto.randomBytes(32).toString('base64url')}`;
}
export function isValidScopeList(v: unknown): v is Scope[] {
  return Array.isArray(v) && v.length > 0 && v.every((s) => (SCOPES as string[]).includes(s as string));
}

/**
 * File-backed API token store (data/tokens.json on the persistent volume).
 * Only hashes are stored; writes are atomic (tmp + rename); a bootstrap
 * CDN_ADMIN_TOKEN from the environment always works as a virtual admin token
 * and is never written to disk.
 */
export class TokenStore {
  private tokens: StoredToken[] = [];
  private file: string;

  constructor(dataDir: string, private bootstrapAdminToken: string | null) {
    this.file = path.join(dataDir, 'tokens.json');
  }

  async load(): Promise<void> {
    try {
      const raw = await fs.promises.readFile(this.file, 'utf8');
      const parsed = JSON.parse(raw) as StoredToken[];
      if (Array.isArray(parsed)) this.tokens = parsed;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err;
    }
  }

  private async save(): Promise<void> {
    await fs.promises.mkdir(path.dirname(this.file), { recursive: true, mode: 0o700 });
    const tmp = `${this.file}.${process.pid}.${crypto.randomUUID()}.tmp`;
    await fs.promises.writeFile(tmp, JSON.stringify(this.tokens, null, 2), { mode: 0o600 });
    await fs.promises.rename(tmp, this.file);
  }

  async create(label: string, scopes: Scope[]): Promise<{ token: string; record: PublicToken }> {
    const token = generateToken();
    const record: StoredToken = {
      id: crypto.randomUUID(),
      label: label.slice(0, 100) || 'untitled',
      hash: hashOf(token),
      prefix: token.slice(0, 13),
      scopes,
      createdAt: new Date().toISOString(),
      revokedAt: null,
      lastUsedAt: null,
    };
    this.tokens.push(record);
    await this.save();
    return { token, record: this.toPublic(record) };
  }

  async revoke(id: string): Promise<boolean> {
    const t = this.tokens.find((x) => x.id === id);
    if (!t || t.revokedAt) return false;
    t.revokedAt = new Date().toISOString();
    await this.save();
    return true;
  }

  list(): PublicToken[] { return this.tokens.map((t) => this.toPublic(t)); }
  private toPublic(t: StoredToken): PublicToken { const { hash: _hash, ...rest } = t; return rest; }

  /** Returns the matched token (or 'bootstrap') if it holds any required scope. */
  authenticate(presented: string | undefined, required: Scope[]): StoredToken | 'bootstrap' | null {
    if (!presented) return null;
    const presentedHash = Buffer.from(hashOf(presented));
    if (this.bootstrapAdminToken) {
      const bootHash = Buffer.from(hashOf(this.bootstrapAdminToken));
      if (crypto.timingSafeEqual(presentedHash, bootHash)) return 'bootstrap';
    }
    for (const t of this.tokens) {
      if (t.revokedAt) continue;
      if (crypto.timingSafeEqual(presentedHash, Buffer.from(t.hash)) && t.scopes.some((s) => s === 'admin' || required.includes(s))) {
        t.lastUsedAt = new Date().toISOString();
        void this.save().catch(() => undefined); // best-effort bookkeeping, never blocks auth
        return t;
      }
    }
    return null;
  }
}
