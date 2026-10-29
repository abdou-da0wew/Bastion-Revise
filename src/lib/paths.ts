import fs from 'node:fs';
import path from 'node:path';

/**
 * Filesystem containment, done right.
 * The old implementation used `resolved.startsWith(root)` (sibling-prefix
 * bypass: /srv/public-evil passed for root /srv/public) and never resolved
 * symlinks. Both are fixed here: lexical check with a separator-aware
 * relative test, then a realpath re-check on the actual target.
 */

export function isInside(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel === '' || (!rel.startsWith(`..${path.sep}`) && rel !== '..' && !path.isAbsolute(rel));
}

/** Lexically resolve `userPath` under `root`; null if it escapes. */
export function safeJoin(root: string, userPath: string): string | null {
  const cleaned = userPath.replace(/\\/g, '/').replace(/^\/+/, '');
  if (cleaned.includes('\0')) return null;
  const resolved = path.resolve(root, cleaned);
  return isInside(root, resolved) ? resolved : null;
}

/** True when any segment is a dotfile/dot-dir (`.env`, `.git`, …). */
export function hasDotSegment(root: string, target: string): boolean {
  const rel = path.relative(root, target);
  return rel.split(path.sep).some((s) => s.startsWith('.') && s !== '.' && s !== '..');
}

export interface RealFile { realPath: string; stat: fs.Stats }

/**
 * Resolve symlinks and verify the REAL target is still inside root and is a
 * regular file. This is what defeats symlink escapes and extension laundering.
 */
export async function realFileInside(root: string, candidate: string): Promise<RealFile | null> {
  let realRoot: string;
  let realPath: string;
  try {
    realRoot = await fs.promises.realpath(root);
    realPath = await fs.promises.realpath(candidate);
  } catch {
    return null;
  }
  if (!isInside(realRoot, realPath)) return null;
  try {
    const stat = await fs.promises.stat(realPath);
    return stat.isFile() ? { realPath, stat } : null;
  } catch {
    return null;
  }
}

/** Package / version / filename identifiers for the /dl/ registry. */
const NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
export function isValidName(name: string): boolean {
  return NAME_RE.test(name) && !name.startsWith('.') && !name.includes('..');
}
/** Versions: semver-ish or a plain tag. `latest` is reserved as an alias. */
export function isValidVersion(v: string): boolean {
  return /^[A-Za-z0-9][A-Za-z0-9._+-]{0,63}$/.test(v) && !v.includes('..');
}

/** Extensions that may never be uploaded/served from the registry, even if configured. */
export const HARD_BLOCKED_PACKAGE_EXT = new Set(['.env', '.pem', '.key', '.p12', '.pfx']);
