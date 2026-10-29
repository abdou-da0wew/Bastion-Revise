# Configuration

All configuration is environment-driven (`.env`, see `.env.example`) and
**validated at startup**: every problem is reported at once and the process
exits — no NaN ports, no crash-loops on a misspelled log level, no silent
mutation of defaults between calls.

| Variable | Default | Notes |
|---|---|---|
| `CDN_PORT` / `CDN_HOST` | `3005` / `0.0.0.0` | Port validated 1–65535 |
| `CDN_BIND` | `127.0.0.1:3005` | Compose host binding — keep localhost-only behind the tunnel |
| `CDN_ROOT_DIR` | `./public` | Web root (Docker: `/opt/celecdn/public`) |
| `CDN_PACKAGE_DIR` | `./packages` | `/dl/` registry (Docker: `/opt/celecdn/packages`) |
| `CDN_DATA_DIR` | `./data` | Token store (Docker: `/opt/celecdn/data`) |
| `CDN_ADMIN_TOKEN` | — | Bootstrap admin token; required for token/upload APIs |
| `CDN_API_ENABLED` | `true` | Turn off to serve files placed on disk only |
| `CDN_RATE_LIMIT_MAX` / `_AUTH_MAX` | `1000` / `60` per minute | Auth routes use the stricter cap |
| `CDN_TRUST_PROXY` | `false` | `true`, or a proxy IP/CIDR list (e.g. Cloudflare ranges). Never blindly `true` on an internet-facing origin |
| `CDN_CORS_ORIGIN` | `*` | Comma-separated list; `*` + credentials is rejected at startup |
| `CDN_CORS_CREDENTIALS` | `false` | |
| `CDN_WEB_EXTENSIONS` / `CDN_PACKAGE_EXTENSIONS` | web-safe / registry lists | Comma-separated allowlists; package secrets are hard-blocked regardless |
| `CDN_MAX_FILE_SIZE` / `CDN_MAX_UPLOAD_SIZE` | 500 MB / 1 GB | `0` = unlimited file size (uploads always need a positive cap) |
| `CDN_MAX_STREAMS` | `128` | Concurrent file-stream gate (503 beyond) |
| `CDN_CACHE_STATIC/MEDIA/DOCUMENTS/TEXT` | 1 y / 30 d / 1 d / 1 h | Web-root TTL overrides (seconds) |
| `CDN_COMPRESSION_ENABLED` / `_THRESHOLD` | `true` / `1024` | Brotli/gzip via `@fastify/compress` |
| `CDN_LOG_LEVEL` / `CDN_LOG_PRETTY` | `info` / non-prod | Enum-validated |
| `CDN_METRICS_ENABLED` / `_PUBLIC` | `true` / `false` | `/metrics` needs an admin/read token unless public |
| `CDN_HEALTH_PATH` | `/health` | Must stay outside `/dl` |
| `WEBHOOK_ENABLED` | `false` | **Off by default** — Discord alerts are opt-in |
| `DISCORD_WEBHOOK_URL` | — | Required & format-validated when webhooks are on |
| `WEBHOOK_EVENTS` | all | Subset of `server.start,server.error,upload,file.delete,token.create,token.revoke,auth.failure,rate.limit` |
| `WEBHOOK_THROTTLE_MS` | `60000` | Per-event minimum gap — storms can't spam |
| `TUNNEL_TOKEN` | — | Cloudflare Tunnel token (compose `tunnel` profile only) |
