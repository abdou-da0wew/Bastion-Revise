<div align="center">

# 🛡️ Bastion

**One project: a hardened CDN core for infrastructure + a dashboard for people.**

Upload files, get CDN URLs, control access, watch every access log — and let the
Bastion CDN core stream the bytes with Range, compression, caching and metrics.

[![CI](https://github.com/abdou-da0wew/hk-cdn/actions/workflows/ci.yml/badge.svg)](https://github.com/abdou-da0wew/hk-cdn/actions/workflows/ci.yml)
[![CodeQL](https://github.com/abdou-da0wew/hk-cdn/actions/workflows/codeql.yml/badge.svg)](https://github.com/abdou-da0wew/hk-cdn/actions/workflows/codeql.yml)
![Bun](https://img.shields.io/badge/CDN%20core-Bun-black?logo=bun)
![Next.js](https://img.shields.io/badge/dashboard-Next.js-black?logo=nextdotjs)
![License](https://img.shields.io/badge/license-MIT-green)

</div>

## 🧩 The two halves

| Piece | Where | Job |
|---|---|---|
| **Bastion CDN core** | repo root (`src/`, Bun + Fastify) | Infra: web root, `/dl/<name>/<version>/<file>` registry for executables & scripts, scoped service tokens, Range streaming, compression, cache policy, Prometheus metrics, optional Discord alerts |
| **Bastion dashboard** | `apps/dashboard/` (Next.js + MongoDB) | Humans: accounts, uploads, URL copying, per-file access rules, access/audit logs, analytics, settings, admin |
| **MongoDB** | compose service | Users, file metadata, audit/access logs (bytes live on the CDN core, never in Mongo) |

**How they work together:** the dashboard authenticates users, enforces quotas and
per-file access rules (domains, IPs, user-agents, referer, rate limits), writes an
audit/access log for every mediated download, then redirects to the CDN core, which
does the heavy lifting (streaming, ranges, caching). Uploads flow the other way:
dashboard → CDN core `/api/files/<user-namespace>/<version>/<file>` with a scoped
service token, SHA-256 verified and atomically published.

## 👥 Accounts & admin levels

Register/login (first account — or any `BASTION_SUPERADMIN_EMAILS` address — becomes
superadmin), per-user quotas, account suspension, and **account lifetime/expiry**.

| Level | Role | Powers |
|---|---|---|
| 0 | `user` | own files, URLs, logs, settings, API key |
| 1 | `moderator` | + view all accounts, suspend/activate plain users |
| 2 | `admin` | + roles below own level, quotas, lifetime, delete users |
| 3 | `superadmin` | + everything, incl. CDN core token management |

Nobody can modify an account at or above their own level — enforced in the API, not just the UI.

## 🚀 Run it (Docker, recommended)

```bash
cp .env.example .env   # set CDN_ADMIN_TOKEN, JWT_SECRET, TUNNEL_TOKEN…
scripts/deploy.sh
docker compose --profile tunnel up -d   # → https://cdn.celestialb.cv
```

Services: CDN core `:3005`, dashboard `:3000`, MongoDB — all
`restart: unless-stopped`, healthchecked, logs capped at 10 MB × 3, state in
`/opt/celecdn/` (+ a Mongo volume). Both Dockerfiles use **exec-form
`ENTRYPOINT` + `CMD`** so the app is PID 1 and `docker stop` drains cleanly.

## 🛠️ Run it (dev, no Docker)

```bash
bun install && bun run start                          # CDN core on :3005
cd apps/dashboard && bun install && bun dev           # dashboard on :3000 (needs MongoDB)
```

## 📦 Publish a file

```bash
# dashboard: sign in → Upload (versioned), or via curl + a token:
CELECDN_TOKEN=<upload-token> scripts/publish.sh mytool 1.2.3 ./mytool-linux-x64
curl -O https://cdn.celestialb.cv/dl/mytool/1.2.3/mytool-linux-x64
curl -O https://cdn.celestialb.cv/dl/mytool/latest/mytool-linux-x64
```

## 📖 Docs

| Doc | Contents |
|---|---|
| [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) | Docker, `/opt/celecdn`, Cloudflare Tunnel (`cdn.celestialb.cv`), recovery, logs |
| [docs/API.md](docs/API.md) | CDN tokens/uploads, dashboard APIs, `/dl/` semantics |
| [docs/ROLES.md](docs/ROLES.md) | Account & admin model (3 admin levels, lifetime, quotas) |
| [docs/CONFIGURATION.md](docs/CONFIGURATION.md) | Every environment variable |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) | Request flow, streaming, caching, metrics/tracing |
| [docs/SECURITY.md](docs/SECURITY.md) | Threat model & hardening checklist |
| [apps/dashboard/README.md](apps/dashboard/README.md) | Dashboard-specific notes (upstream import) |
| [AUDIT.md](AUDIT.md) | The audit that drove the CDN core rewrite |

## 🧪 Quality gates

```bash
bun run check                 # CDN core: strict tsc + 28 tests
bun audit                     # → No vulnerabilities found
cd apps/dashboard && bunx tsc --noEmit && npx next build && bun test test
```

## 🤝 Contributing & licence

[CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) · [MIT](LICENSE)
Dashboard imported from `abdou-da0wew/Bastion` (see `apps/dashboard/UPSTREAM.md`) and unified here.

<div align="center"><sub>Fortified file delivery — Bastion CDN core × Bastion dashboard.</sub></div>
