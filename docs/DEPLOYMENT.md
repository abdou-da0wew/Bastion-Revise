# Deployment — Docker, `/opt/celecdn`, Cloudflare Tunnel

> **Bastion is one Compose project**: `cdn` (CDN core), `dashboard` (Next.js, `apps/dashboard`), `mongo`, and the optional `cloudflared` profile. The dashboard needs `JWT_SECRET` in `.env` and (optionally) `CDN_SERVICE_TOKEN` — a scoped CDN token (`upload,manage,read`) minted with the bootstrap admin token; without it the dashboard cannot publish. Dashboard binds `127.0.0.1:3000` by default (`DASHBOARD_BIND`); route a second tunnel hostname (e.g. `bastion.celestialb.cv` → `http://dashboard:3000`) if it should be public.


## Layout on the host

```
/opt/celecdn/
├── public/     web root  (GET /<path>)
├── packages/   registry  (GET /dl/<name>/<version>/<file>, uploads land here)
├── data/       tokens.json (API token hashes, mode 0600)
└── logs/       reserved for host tooling — the app itself logs to stdout only
```

The compose bind mount ` /opt/celecdn:/opt/celecdn` makes uploads, dropped-in
files and token state survive container rebuilds.

## First deploy

```bash
git clone <this repo> && cd hk-cdn
scripts/deploy.sh            # creates /opt/celecdn/*, .env, builds, starts
```

Edit `.env` first (the script stops and tells you if it's fresh):

```env
CDN_ADMIN_TOKEN=<openssl rand -hex 32>
TUNNEL_TOKEN=<see below>
```

## Cloudflare Tunnel → `cdn.celestialb.cv`

1. Cloudflare Zero Trust → **Networks → Tunnels** → create a tunnel (name e.g. `celecdn`).
2. Copy its token into `.env` as `TUNNEL_TOKEN=…` (never commit it).
3. In the tunnel's **Public Hostnames**, add:
   `cdn.celestialb.cv` → HTTP → `cdn:3005`
   (`cdn` is the compose service name — cloudflared runs in the same Docker network.)
4. Start it: `docker compose --profile tunnel up -d`
5. Verify: `curl https://cdn.celestialb.cv/health` → `{"status":"ok"}`

The origin port is published as `127.0.0.1:3005` by default, so the tunnel is the
only public door and direct-to-origin attacks can't bypass Cloudflare.

## Recovery behaviour

| Failure | Behaviour |
|---|---|
| App crash / OOM kill | `restart: unless-stopped` resurrects it; Docker healthcheck gates the tunnel's `depends_on` |
| `docker kill`, host reboot | Same — containers come back with the daemon (enable Docker on boot) |
| SIGTERM / deploy | App drains connections & open streams for up to 25 s before exiting (`stop_grace_period: 30s`) |
| Bad `.env` | App exits immediately with a readable validation error instead of crash-looping silently — fix the named variable |

## Log policy (no disk thrash)

- The app writes **structured logs to stdout only** — no log files in the container.
- Compose caps Docker's json-file driver at **10 MB × 3 files per container** (~30 MB max, ever).
- Discord webhook errors are logged at most once per throttle window.
- Inspect with `docker compose logs -f cdn` / `docker compose logs -f cloudflared`.

## Updates & rollback

```bash
git pull && docker compose up -d --build     # rolling replace; /opt/celecdn is untouched
docker compose down                          # stop (files & tokens persist in /opt/celecdn)
```

## Without Docker (bare Bun)

```bash
bun install && CDN_ADMIN_TOKEN=… bun run start
```

Set `CDN_ROOT_DIR`, `CDN_PACKAGE_DIR`, `CDN_DATA_DIR` to your `/opt/celecdn/*`
paths and run it under systemd with `Restart=always` for the same self-healing.
