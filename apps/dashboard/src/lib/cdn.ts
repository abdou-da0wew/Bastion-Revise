/**
 * Bastion CDN core client (server-only).
 * The dashboard never talks to the CDN from the browser: it uses the internal
 * URL + a service token, and hands users public /dl/ URLs.
 */
const INTERNAL = process.env.CDN_INTERNAL_URL || "http://127.0.0.1:3005";
export const CDN_PUBLIC_URL = (process.env.NEXT_PUBLIC_CDN_URL || process.env.NEXT_PUBLIC_BASTION_CDN_URL || "https://cdn.celestialb.cv").replace(/\/$/, "");

function serviceToken(): string {
  const t = process.env.CDN_SERVICE_TOKEN || process.env.CDN_ADMIN_TOKEN || "";
  if (!t) throw new Error("CDN_SERVICE_TOKEN (or CDN_ADMIN_TOKEN) is not set — dashboard↔CDN bridge is not configured");
  return t;
}

async function cdnFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${INTERNAL}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${serviceToken()}`, ...(init?.headers || {}) },
    signal: AbortSignal.timeout(30_000),
  });
}

export interface CdnUploadResult { name: string; version: string; file: string; size: number; sha256: string; url: string; latestUrl: string }

export async function cdnUpload(pkg: string, version: string, filename: string, body: Buffer): Promise<CdnUploadResult> {
  const res = await cdnFetch(`/api/files/${encodeURIComponent(pkg)}/${encodeURIComponent(version)}/${encodeURIComponent(filename)}`, {
    method: "PUT",
    headers: { "content-type": "application/octet-stream" },
    // Buffer is a valid fetch body in Node/Bun runtimes used server-side.
    body: new Uint8Array(body),
  });
  if (!res.ok) throw new Error(`CDN upload failed (${res.status}): ${(await res.text()).slice(0, 300)}`);
  const data = (await res.json()) as CdnUploadResult;
  return { ...data, url: `${CDN_PUBLIC_URL}${data.url}`, latestUrl: `${CDN_PUBLIC_URL}${data.latestUrl}` };
}

export async function cdnDeleteFile(pkg: string, version: string, filename: string): Promise<void> {
  await cdnFetch(`/api/files/${encodeURIComponent(pkg)}/${encodeURIComponent(version)}/${encodeURIComponent(filename)}`, { method: "DELETE" }).catch(() => undefined);
}
export async function cdnListRegistry(): Promise<unknown> {
  const res = await cdnFetch("/api/files");
  if (!res.ok) throw new Error(`CDN list failed (${res.status})`);
  return res.json();
}
export async function cdnHealth(): Promise<{ health: unknown; ready: unknown; metricsOk: boolean }> {
  const [health, ready, metrics] = await Promise.all([
    fetch(`${INTERNAL}/health`, { signal: AbortSignal.timeout(5000) }).then((r) => r.json()).catch(() => null),
    fetch(`${INTERNAL}/ready`, { signal: AbortSignal.timeout(5000) }).then((r) => r.json()).catch(() => null),
    cdnFetch("/metrics").then((r) => r.ok).catch(() => false),
  ]);
  return { health, ready, metricsOk: metrics };
}
export async function cdnTokens(method: "GET" | "POST" | "DELETE", path = "", body?: unknown): Promise<Response> {
  return cdnFetch(`/api/tokens${path}`, {
    method,
    ...(body ? { headers: { "content-type": "application/json" }, body: JSON.stringify(body) } : {}),
  });
}
export const userPackage = (cdnPackage: string) => cdnPackage;
