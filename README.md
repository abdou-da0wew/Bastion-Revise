<div align="center">

# 🌌 CeleCDN

**A fast, hardened CDN + versioned package registry — built on Bun & Fastify.**

Serve web assets from disk, publish executables & scripts under immutable versioned URLs,
manage everything with scoped API tokens, and watch it all with metrics, tracing and
(optional) Discord alerts.

[![CI](https://github.com/abdou-da0wew/hk-cdn/actions/workflows/ci.yml/badge.svg)](https://github.com/abdou-da0wew/hk-cdn/actions/workflows/ci.yml)
[![CodeQL](https://github.com/abdou-da0wew/hk-cdn/actions/workflows/codeql.yml/badge.svg)](https://github.com/abdou-da0wew/hk-cdn/actions/workflows/codeql.yml)
![Bun](https://img.shields.io/badge/runtime-Bun-black?logo=bun)
![TypeScript](https://img.shields.io/badge/TypeScript-strict-blue?logo=typescript)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

---

## ✨ What it does

| Area | Highlights |
|---|---|
| 🌐 **Web CDN** | Static root with per-type cache TTLs, strong conditional requests, gzip/Brotli compression |
| 📦 **Package registry (`/dl/`)** | Versioned executables & scripts: `/dl/<name>/<version>/<file>` + floating `/dl/<name>/latest/<file>`, SHA-256 ETags, `immutable` caching, forced-download headers |
| ⬆️ **Upload API** | Streaming raw-body uploads (hashed while streaming, atomic publish), direct disk placement also just works |
| 🔑 **Token lifecycle** | Create/list/revoke scoped tokens (`admin` `upload` `manage` `read`) — hashes only on disk, plaintext shown once |
| 📡 **Streaming** | Correct RFC 9110 Range (suffix, clamping, `If-Range`, 416) — seekable audio/video, resumable downloads |
| 🛡️ **Security** | Realpath containment (no traversal/symlink escapes), dotfile deny, extension allowlists, Helmet CSP, fixed 429 rate limiting, proxy trust off by default |
| 📊 **Observability** | Prometheus `/metrics`, `/health` + `/ready`, `x-request-id` correlation on every response, redacted structured logs |
| 🔔 **Discord alerts** | Toggleable webhooks for starts, errors, uploads, token events, auth failures — throttled, off by default |
| 🐳 **Deployment** | Docker + Compose, self-healing (`restart: unless-stopped`, healthchecks), capped log rotation, optional Cloudflare Tunnel at **https://cdn.celestialb.cv** |

## 🚀 Quick start

```bash
bun install
cp .env.example .env          # set CDN_ADMIN_TOKEN (openssl rand -hex 32)
bun run start                 # http://localhost:3005
```

```bash
curl http://localhost:3005/health
curl http://localhost:3005/hello/test.txt
curl -H 'Range: bytes=0-99' http://localhost:3005/music/test-tone.wav   # 206 Partial Content
```

### Publish a binary in 30 seconds

```bash
# 1. mint an upload token (admin = CDN_ADMIN_TOKEN from .env)
TOKEN=$(curl -s -X POST http://localhost:3005/api/tokens \
  -H "Authorization: Bearer $CDN_ADMIN_TOKEN" -H 'content-type: application/json' \
  -d '{"label":"ci","scopes":["upload","read"]}' | bun -e 'console.log(JSON.parse(await new Response(Bun.stdin.stream()).text()).token)')

# 2. upload (streaming, SHA-256 verified server-side)
CELECDN_TOKEN=$TOKEN scripts/publish.sh mytool 1.2.3 ./mytool-linux-x64 http://localhost:3005

# 3. serve it — pinned or floating
curl -O https://cdn.celestialb.cv/dl/mytool/1.2.3/mytool-linux-x64
curl -O https://cdn.celestialb.cv/dl/mytool/latest/mytool-linux-x64
```

Prefer no API? Just drop files into `packages/<name>/<version>/<file>` plus a
`manifest.json` (see [docs/API.md](docs/API.md)) — or into the web root — and they're live.

## 🐳 Docker (the supported deployment)

```bash
scripts/deploy.sh                       # creates /opt/celecdn/*, builds, starts
docker compose --profile tunnel up -d   # + Cloudflare Tunnel → cdn.celestialb.cv
```

Everything persistent lives in **`/opt/celecdn/`** on the host (`public/`, `packages/`,
`data/`, `logs/`). Containers restart themselves, logs are size-capped (no disk thrash),
and the origin port stays on localhost — the tunnel is the public door.
Full walkthrough: **[docs/DEPLOYMENT.md](docs/DEPLOYMENT.md)**.

## 📖 Docs

| Doc | What's inside |
|---|---|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, `/opt/celecdn`, Cloudflare Tunnel for `cdn.celestialb.cv`, recovery, log policy |
| [docs/API.md](docs/API.md) | Tokens, uploads, file listing/deletion, `/dl/` semantics, curl recipes |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Every environment variable, validated behaviour |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Request flow, streaming, caching, resource gates, metrics/tracing |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model, hardening checklist, what was fixed from the audit |
| [AUDIT.md](AUDIT.md) | The original deep-audit that drove this rewrite (kept for posterity) |

## 🧪 Quality gates

```bash
bun run check   # tsc --noEmit (strict) + 28 tests (every audit PoC is a regression test)
bun audit       # → No vulnerabilities found
```

## 🤝 Contributing & licence

See [CONTRIBUTING.md](CONTRIBUTING.md) and [SECURITY.md](SECURITY.md).
Released under the [MIT Licence](LICENSE).

<div align="center"><sub>Built with ❤️ on Bun + Fastify — be excellent to your cache.</sub></div>
