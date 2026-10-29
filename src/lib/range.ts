/**
 * Strict RFC 9110 §14 Range parsing.
 * Replaces `range.replace(/bytes=/,'').split('-')` + parseInt, which 500'd on
 * suffix ranges, hung connections on over-long ranges, and silently truncated
 * multi-ranges.
 */
export type RangeResult =
  | { kind: 'none' }
  | { kind: 'range'; start: number; end: number }
  | { kind: 'unsatisfiable' };

const SINGLE = /^bytes=(\d*)-(\d*)$/;

export function parseRange(header: string | undefined, size: number): RangeResult {
  if (!header) return { kind: 'none' };
  const m = SINGLE.exec(header.trim());
  if (!m) return { kind: 'unsatisfiable' }; // unknown unit, multi-range, garbage → 416 (never 500)
  const [, first, last] = m;
  if (first === '' && last === '') return { kind: 'unsatisfiable' };
  if (size === 0) return { kind: 'unsatisfiable' };

  if (first === '') {
    // Suffix range: last N bytes
    const suffix = Number(last);
    if (!Number.isSafeInteger(suffix) || suffix <= 0) return { kind: 'unsatisfiable' };
    return { kind: 'range', start: Math.max(0, size - suffix), end: size - 1 };
  }
  const start = Number(first);
  if (!Number.isSafeInteger(start) || start >= size) return { kind: 'unsatisfiable' };
  if (last === '') return { kind: 'range', start, end: size - 1 };
  const end = Number(last);
  if (!Number.isSafeInteger(end) || end < start) return { kind: 'unsatisfiable' };
  return { kind: 'range', start, end: Math.min(end, size - 1) }; // clamp — Content-Length always matches the body
}

/** Parse an entity-tag list for If-None-Match / If-Range (weak comparison, RFC 9110 §8.8.3.2). */
export function etagMatches(header: string | undefined, etag: string): boolean {
  if (!header) return false;
  const target = etag.replace(/^W\//, '');
  return header.split(',').some((raw) => {
    const t = raw.trim();
    return t === '*' || t.replace(/^W\//, '') === target;
  });
}
export function parseHttpDate(v: string | undefined): number | null {
  if (!v) return null;
  const t = Date.parse(v);
  return Number.isNaN(t) ? null : t;
}
