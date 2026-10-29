# Architecture

```
                ┌──────────── Cloudflare Tunnel (cloudflared, profile: tunnel)
   Internet ────┤  https://cdn.celestialb.cv
                ▼
        ┌──────────────────────────── CeleCDN (Bun + Fastify) ───────────────────────────┐
        │ genReqId → x-request-id · helmet/CORS · rate-limit (real 429) · compression     │
        │                                                                                   │
        │  GET/HEAD /*            web root      safeJoin → realpath-in-root → serveFile     │
        │  GET/HEAD /dl/…         registry      manifest (SHA-256 ETag) → serveFile         │
        │  PUT/DELETE /api/files  token auth    stream → tmp → sha256 → atomic rename       │
        │  */api/tokens           admin auth    hash-only token store (0600)                │
        │  /health /ready /metrics              minimal health, readiness, Prometheus       │
        └───────────────────────────────────────────────────────────────────────────────────┘
                     │ reads/writes                         │ optional, throttled
                     ▼                                      ▼
        /opt/celecdn/{public,packages,data}          Discord webhook (off by default)
```

## Request flow for a file (`serveFile`, `src/lib/serve.ts`)

1. Lexical containment (`path.relative`, separator-aware) — kills `../` and the sibling-prefix bypass.
2. Dot-segment deny (`.env`, `.git`, …) and extension allowlist.
3. `realpath` containment — kills symlink escapes & extension laundering; target must be a regular file.
4. Conditionals **before** Range: `If-None-Match` (weak/list/`*`) → 304, else `If-Modified-Since` (second granularity); `If-Range` gate for ranges.
5. Strict single-Range parse (suffix, clamped, 416 on garbage/multi-range) — `Content-Length` always equals bytes actually sent.
6. Concurrency gate (`CDN_MAX_STREAMS`) → open-file-handle stream; destroyed on client disconnect; errors handled, never leaked.

## Performance choices

- **Streaming everywhere** — constant memory for 500 MB files and uploads (hashed while streaming).
- **Compression** via `@fastify/compress` (Brotli/gzip, 1 KB threshold); ranges stay byte-exact.
- **Cache policy:** per-type TTLs for the web root (no more `immutable` on mutable JSON/HTML), `immutable` only for pinned `/dl/` versions where it is true by construction.
- **One stat per request** from the resolved path, no sync fs on the hot path.
- Metrics are hand-rolled counters (no prom-client dependency weight).

## Observability

- **Correlation:** incoming `x-request-id` (validated) or a UUID is stamped on every response and log line.
- **Logs:** pino JSON to stdout, `authorization`/`cookie`/`x-api-token` redacted; Docker caps disk at 10 MB×3.
- **Metrics:** `celecdn_http_requests_total`, `celecdn_bytes_served_total`, `celecdn_range_requests_total`, `celecdn_uploads_total`, `celecdn_auth_failures_total`, `celecdn_active_streams`, uptime/RSS at `/metrics` (admin token unless `CDN_METRICS_PUBLIC=true`).
- **Health:** `/health` = `{status:"ok"}` only; `/ready` verifies all three storage dirs.

## Resource management

Bounded concurrent streams, 10 s connection timeout, 72 s keep-alive, upload size
caps with mid-stream abort + temp-file cleanup, atomic manifest/token writes
(tmp + rename + fsync for uploads), and graceful shutdown that drains for 25 s.
