# Deep Security & Code-Quality Audit — hk-cdn

**Date:** 2026-10-29 · **Commit audited:** `ead7ff6` (initial commit) · **Scope:** `index.ts` (439 lines), `config.ts` (203), `package.json`, `tsconfig.json`, `.env.example`, `.gitignore`, all docs, `public/`
**Method:** full manual review + dependency audit (`npm audit`, `tsc --noEmit`) + **live black-box exploitation** of a running server against a fixture tree in `/tmp` (sibling dirs, symlinks, dotfiles, secrets). Findings marked ✅ were reproduced over HTTP; others are code-inspection findings. **No fixes were applied** — this is the hunt report. The repo's self-description ("production-ready", PROJECT_SUMMARY.md:3) is not supported by the evidence below.

## Verdict

**Do not deploy this to the internet as-is.** Three independent unauthenticated file-disclosure escapes, a Range implementation that returns 500s and hangs connections, and a rate limiter that (a) returns HTTP 500 instead of 429 and (b) is trivially bypassed by spoofing `X-Forwarded-For`. TypeScript does not even compile.

| Severity | Count | Headlines |
|---|---|---|
| 🔴 Critical | 3 | sibling-prefix path traversal, symlink escape, dotfile/secret disclosure |
| 🟠 High | 6 | Range hangs + 500/stack leak, rate-limit 500 + XFF bypass, non-allowlist file serving, stored-XSS surface, vulnerable unused dep, leaked error internals |
| 🟡 Medium | 12 | conditional-request (ETag) bugs, cache/`immutable` misuse, header inconsistency, health info leak, config mutation, unvalidated env, sync-I/O/TOCTOU, no shutdown/timeouts… |
| 🔵 Low / quality | 15+ | dead code/config/deps, no tests/CI/lint/typecheck, false docs, fake test MP3 (512,000 zero bytes)… |

---

## 🔴 Critical

### C1. Path-traversal: sibling-prefix bypass in `safePath` ✅
`index.ts:176-183` — `resolvedPath.startsWith(rootDirectory)` with no trailing separator, so any **sibling directory sharing the name prefix** passes:
```ts
const resolvedPath = path.normalize(path.join(rootDirectory, requestPath));
if (!resolvedPath.startsWith(rootDirectory)) return null;
```
Reproduced (root=`/tmp/cdn-audit/root`):
```
curl --path-as-is http://127.0.0.1:3005/../root-evil/secret.txt        → 200 SIBLING_SECRET
curl --path-as-is http://127.0.0.1:3005/%2e%2e/root-evil/secret.txt    → 200
curl --path-as-is http://127.0.0.1:3005/hello/../../root-evil/secret.txt → 200
```
Plain `../outside/` is blocked (403), which creates false confidence. Real-world roots like `.../public` next to `.../public-backup`, `.../public2`, `.../public_old` are exposed. Normal browsers normalize `..`, but `curl --path-as-is`, scripts, and many proxies send it raw — this is a network-reachable unauthenticated read.
**Fix:** `const rel = path.relative(root, resolved); if (rel.startsWith('..'+path.sep) || path.isAbsolute(rel)) reject;` and compare against `root + path.sep`.

### C2. Symlink escape — no `realpath` anywhere ✅
Checks are purely lexical; the filesystem happily follows links out of the root. All reproduced with root=`/tmp/.../root`:
```
GET /link.txt               → 200 OUTSIDE_SECRET_via_symlink   (link → ../outside/secret.txt)
GET /escape-dir/secret.txt  → 200 OUTSIDE_SECRET_via_symlink   (dir symlink)
GET /hostname.txt           → 200 e2b.local                    (link → /etc/hostname)
GET /fake.txt               → 200 FAKE_ENV_CONTENT             (link → outside/real.env — blocked extension laundered through a .txt name)
```
Extension checks (`index.ts:187-200`) test the *link name*, not the target, so symlinks also defeat the blocklist. Any workflow that populates `public/` from tarballs, rsync, git, or user content can plant these.
**Fix:** `fs.realpath` the resolved path and re-check containment + extension on the real target; or open with `O_NOFOLLOW` semantics and refuse symlinks outright.

### C3. Dotfiles & secrets served: `.env` bypass ✅
`path.extname('.env') === ''` in Node, so the `.env` entry in `blockedExtensions` (`config.ts:149`) **never matches the file actually named `.env`**. There is also no dotfile rule at all:
```
GET /.env     → 200 DOTENV_SECRET=supersecret123  (application/octet-stream)
GET /.hidden  → 200
GET /real.env → 403  (only the non-dotfile spelling is blocked)
```
Same logic exposes `/.git/config` (extensionless), `/.npmrc`, `/.ssh/...` if the root ever overlaps a real directory — and the docs actively encourage pointing `CDN_ROOT_DIR` at *another project's* public dir.
**Fix:** reject any path segment starting with `.`; check basename blocklist in addition to extension.

---

## 🟠 High

### H1. Range handling: hangs connections + 500s + stack traces ✅
`index.ts:309-335`. Parsing is `range.replace(/bytes=/,'').split('-')` + `parseInt`, with no NaN check, no clamping, no suffix-range support, no `start<=end` check:
```
Range: bytes=-5        → 500  (suffix ranges — used by every media player — crash; parseInt('')=NaN)
Range: bytes=abc-def   → 500  {"message":"The value of \"start\" is out of range… Received NaN",
                               "stack":"RangeError… at Object.<anonymous> (/home/user/hk-cdn/index.ts:322:23)"}
Range: bytes=           → 500      Range: items=0-4 → 500      Range: bytes=10-5 → 500
Range: bytes=0-999999 on a 21-byte file → 206 Content-Length: 1000000, Content-Range: bytes 0-999999/21
                               → server sends 21 bytes then holds the socket open; client hangs until timeout
Range: bytes=0-4,10-14 → 206 with only the first range (silently wrong; no multipart, no 416)
```
Impact: (1) trivial unauthenticated 500s; (2) **connection-pinning DoS** — each oversized range holds a socket/FD until client timeout, and rate limiting counts requests, not pinned connections; (3) info leak — `index.ts:416` includes `error.stack` whenever `NODE_ENV !== 'production'` (i.e. unset = leak by default), and `error.message` (internal Node/Fastify text + absolute paths) is leaked in **all** modes via `index.ts:414`. Lenient parsing also accepts `bytes=0.5-4`, `bytes=+0-4`, `bytes= 0-4`.
**Fix:** parse with a strict regex, support suffix ranges, clamp `end=min(end,size-1)`, 416 on `start>end`/`start>=size`/multi-range (or implement multipart), validate before creating the stream, and never return `error.message`/`stack` to clients.

### H2. Rate limiter returns 500 (not 429) and is bypassable via `X-Forwarded-For` ✅
Two independent breaks:
1. **Wrong status + NaN.** With `CDN_RATE_LIMIT_MAX=5`, the 6th request returns `500 {"message":"Rate limit exceeded. Try again in NaN seconds."}`. Root cause is visible in the type error the author ignored: `context.after` is a **string** (`"53 seconds"`/`"1 minute"` in the rate-limit logs), so `Math.round(context.after / 1000)` (`index.ts:153`) is `NaN`, and the object returned by `errorResponseBuilder` (`{code:429,…}`, no `statusCode`) is then fed to the global error handler (`index.ts:405-418`), which defaults to 500. Monitoring/alerting on 429s will never fire; clients get a server-error contract.
2. **Spoofing.** `trustProxy: true` (`config.ts:156`, unconditional trust of *any* proxy) means Fastify takes the client IP from `X-Forwarded-For`. Reproduced: after exhausting 127.0.0.1's quota, 8 requests each with a different `X-Forwarded-For: 9.9.9.N` all returned 200 with fresh quotas (server log confirms `remoteAddress: 9.9.9.x`). Attackers can also *burn a victim's quota* by spoofing their IP. Only safe if the origin is provably reachable **only** through Cloudflare — nothing enforces or documents that, and the server binds `0.0.0.0`.

Also: limiter is in-memory per process (multi-instance = multiplied limits), `skipOnError: true` fails open (`index.ts:142`), `cache: 10000` bounds tracked IPs, `banDuration` (`config.ts:32,121`) is **never used**, `redis: undefined` (`index.ts:141`) despite README/PROJECT_SUMMARY claiming Redis support, and it meters *requests*, not bytes — one request can pull 500 MB.

### H3. No allowlist: arbitrary file types served, blocklist full of holes ✅
`allowedExtensions: []` = allow everything (`config.ts:140`). The blocklist omits common secret/backup types — all reproduced: `GET /key.pem → 200 PEM_SECRET_KEY_DATA`, `GET /db.sql → 200 backup-data`. Also unblocked: `.key .crt .bak .old .swp .yaml .yml .toml .lock .log .zip .tar.gz` (extname sees `.gz`), source files (`.ts .js .py` is blocked but `.ts` is not — pointing the root at a project dir serves source), `/.git/config`, etc. Meanwhile an **existence oracle** exists: existing blocked file → 403 (`/exists.php`), missing → 404 (`/nope.php`), so attackers can enumerate which sensitive files exist before reaching them via C2/C3-style bypasses.
**Fix:** default-deny allowlist of web-safe extensions; uniform 404 for blocked *and* missing files.

### H4. Stored-XSS / content-sniffing surface ✅
CSP is **off by default** (`config.ts:137`, `contentSecurityPolicy:false`) and no CSP header is emitted; HTML and SVG are servable types:
```
GET /xss.svg  → 200 image/svg+xml   <svg …><script>alert(document.domain)</script></svg>
GET /page.html → 200 text/html      <html><script>alert(1)</script></html>
```
Any script-bearing file placed in the root executes in the CDN origin. If that origin shares a parent domain with an app (cookies scoped to the domain, CORS `*` at `config.ts:128`), this is stored XSS against the app. `X-Content-Type-Options: nosniff` is added manually only on full 200 GETs (`index.ts:375-376`), not on 206 responses. Serve user content from a sandboxed, cookie-less domain, send a restrictive CSP / `Content-Security-Policy: sandbox`, and `Content-Disposition: attachment` for non-web types.

### H5. Vulnerable dependency shipped (unused) + everything outdated ✅
`npm audit`: **1 high** — `@fastify/static@7.0.4` (GHSA-83w8-p2f5-377r path-traversal route-guard bypass, CVSS 7.5; GHSA-8pvw-jcv7-9cmj). The package is imported (`index.ts:5`) but **never registered**, so the CVE is not reachable through it today — it is pure supply-chain/audit-noise risk and a trap for the next editor who wires it up. `npm outdated`: every direct dependency is behind (cors 10→11, helmet 12→13, rate-limit 10→11, static 7→10, pino 9→10, TS 5→7; installed fastify resolved to 5.12.7 vs bun.lock's 5.6.2, so Bun/npm installs already diverge). `pino-pretty` (a dev tool) and `pino` (unused directly) are production deps, widening the install surface.

### H6. Error contract leaks internals in production too ✅
`index.ts:405-418`: every error returns `message: error.message` (Node internals, absolute paths — see H1 payload) and, outside production, the full `stack`. `NODE_ENV` is unset by default, and under plain Node the `.env` file is never loaded (no dotenv/`loadEnvFile` anywhere — only Bun auto-loads `.env`), so "production" behaviour silently differs by runtime. The global handler also converts *known* client errors into its own shape inconsistently (rate-limit 500s, H2), while Fastify's own `FST_ERR_BAD_URL` 400s bypass parts of the contract.

---

## 🟡 Medium

### M1. Conditional requests (ETag / If-*) violate RFC 9110 ✅ — `index.ts:304, 339-360`
Weak, guessable ETag (`mtime-hex + size-hex`, no content/inode — collisions on same-size/same-ms replacement, and `rsync -t`/preserved mtimes serve stale bytes under `immutable`). Verified against a live ETag:
- `If-None-Match: *` → **200** (must be 304); `If-None-Match: "x", "<etag>"` (list) → **200**; `W/"<etag>"` → **200** (weak comparison ignored).
- `If-None-Match: "wrong"` + `If-Modified-Since: <future>` → **304** (must be 200: IMS must be ignored when INM is present).
- Matching `If-None-Match` + `Range` → **206** (INM must win → 304); `If-Range` is **never evaluated** — stale `If-Range: "stale"` still gets 206 partial instead of 200 full.
304 responses also omit `Last-Modified` on the INM path and validators generally; sub-second mtimes vs 1-second HTTP dates cause spurious 304s.

### M2. Cache headers are wrong/misleading ✅
- `immutable` + 1-year TTL on *unfingerprinted* static/media names (`index.ts:331,372`): replace `song.mp3`, users/CDN keep the old bytes for a year. `immutable` even applies to `.json/.html/.txt` (1 h TTL but immutable semantics).
- Server **forges** `Cloudflare-Cache-Status: HIT` on origin 200/206s and `BYPASS` on HEAD (`index.ts:244,333,374`): the origin cannot know this; it corrupts debugging/monitoring (Cloudflare overwrites it at edge, direct-to-origin consumers are lied to).
- `stale-while-revalidate=${cacheTTL * 0.1}` — fractional for any TTL not divisible by 10 (delta-seconds must be an integer); duplicated as both `max-age` and `s-maxage` in `CDN-Cache-Control`; no `Vary` handling for conditional/range caching.

### M3. Security-header incoherence ✅
Helmet's `Cross-Origin-Resource-Policy: same-origin` is emitted on every response while CORS is `Access-Control-Allow-Origin: *` — CORP blocks the cross-origin embedding (`<img>`, `<video>`, fonts) that is the entire point of a CDN, unless every embed uses CORS mode. Manual `X-Frame-Options: DENY` only on 200 GETs vs Helmet's `SAMEORIGIN` on 206/HEAD/404 (three different policies by code path). `xssFilter: true` is a no-op (response shows `X-XSS-Protection: 0` from helmet v12). HSTS `preload` is sent over plain HTTP with `enforceHTTPS:false` — `security.enforceHTTPS` (`config.ts:67,155`) is **never read**, nor is the top-level `security.enabled` flag (`config.ts:95`): setting either changes nothing. `hidePoweredBy` etc. are fine but no CSP by default (H4).

### M4. Health endpoint leaks internals, shadows a file, eats quota ✅
`GET /health` is unauthenticated and returns `process.memoryUsage()` (rss/heap/external/arrayBuffers) + uptime (`index.ts:383-393`) — free fingerprinting/DoS telemetry for attackers. It also (a) makes a real file named `health` in the root **unservable** (static route wins over `/*`), (b) counts against the rate limit (health checks can 500 themselves under load, compounding H2), and (c) has no liveness/readiness distinction or disk check of the served root.

### M5. `getConfig()` shallow-copies and mutates the shared defaults ✅ — `config.ts:179-198`
`{ ...defaultConfig }` shares nested objects; env overrides write into `defaultConfig` itself. Verified: after one `getConfig()` with `CDN_LOG_LEVEL=debug`, `defaultConfig.logging.level === 'debug'`, and a second clean `getConfig()` still returns `debug`/`7` (`a.logging === b.logging`). In tests/long-lived importers config "sticks" across calls. Fix: `structuredClone(defaultConfig)`.

### M6. Environment config is unvalidated — crashes on typos ✅ — `config.ts:182-198`
Reproduced: `CDN_PORT=abc` → `options.port should be >= 0… Received type number (NaN)` crash; `CDN_PORT=99999` → same; `CDN_LOG_LEVEL=banana` → `default level:banana must be included in custom levels` crash. `CDN_CORS_ORIGIN` takes the raw string, so the documented comma form (`https://a, https://b`) becomes one unmatchable origin; `CDN_RATE_LIMIT_MAX=0/abc` unvalidated; only 6 of ~30 settings are env-configurable (`maxFileSize`, TTLs, blocklists, helmet toggles are edit-the-source only). `.env.example` sets `CDN_ROOT_DIR=` (empty), which only works by falsy-fallback accident.

### M7. Synchronous fs on the hot path + TOCTOU races — `index.ts:225,233,277,293,300`
Every GET performs `existsSync` + `statSync` + an async `stat` (size check) + another `statSync` (4 metadata round-trips, 2–3 of them **event-loop-blocking sync calls**) before `createReadStream` re-opens the path by name. Between check and open the file/symlink can be swapped (TOCTOU — with C2, a check-then-replace race serves the target). There are no `error` listeners on the read streams (`index.ts:322,363`), so a delete/permission change between stat and open surfaces as an unhandled stream error rather than a clean 404/500. HEAD duplicates the same logic and has already drifted: no size check, no ETag/`Last-Modified`, fake `BYPASS` header (`index.ts:215-247`).

### M8. No graceful shutdown, no timeouts, no stream limits
No `SIGINT`/`SIGTERM` handlers and no `fastify.close()` — deploys kill in-flight media streams (ironic given the README's systemd/PM2 recipes use `Restart=always`). `process.exit(1)` inside `buildServer` (`index.ts:170,428`) makes the module un-embeddable/untestable and skips cleanup. No `connectionTimeout`/`keepAliveTimeout`/`requestTimeout` tuning (slow-loris exposure beyond Node defaults), no cap on range size, concurrent streams, or bytes/IP — a single client can open 1,000 concurrent 500 MB streams/minute within the letter of the rate limit.

### M9. Method & routing semantics ✅
Unsupported methods return **404, not 405** (`POST/PUT/DELETE /hello/test.txt → 404`; no `Allow` header), misleading clients and monitors. `HEAD / → 404` while `GET / → 200` JSON; `GET /` leaks name/version (hardcoded `1.0.0`, `index.ts:256-263`, will drift from package.json). Health path colliding with files (M4). `exposeHeadRoutes: true` (`index.ts:88`) coexists uneasily with the hand-rolled `HEAD /*` route (auto-HEAD is silently skipped where it conflicts — behaviour that changes if registration order is ever flipped).

### M10. "Production-ready" runtime claims don't hold
`disableRequestLogging` triggers `FSTDEP023` (removed in Fastify 6). Logging is advertised to `cdn.log` (PROJECT_SUMMARY) but nothing ever writes a file — pino goes to stdout only. `pino-pretty` transport is enabled whenever `NODE_ENV!=="production"`, including unset. If the root dir is missing and logging is disabled, `process.exit(1)` happens silently (errors are logged through the disabled logger, `index.ts:167-170`).

### M11. File-category / MIME inconsistencies
`getCacheTTL` hardcodes a 3600 fallback for unknown types, bypassing config; unknown extensions still get `immutable`. MIME is by extension only (a JPEG named `.txt` is `text/plain`; `nosniff` then blocks/confuses legit embeds, while H4's script types sail through). `FILE_CATEGORIES` lists are stringly-typed duplicated data in code rather than config.

### M12. Directory & metadata oracles
Directories return the same 404 as missing files (good), but blocked-existing → 403 vs missing → 404 (H3) plus `Content-Length` on HEAD for dotfiles (C3) lets attackers fingerprint the tree. Range `416` responses include total file size (`Content-Range: bytes */21`) for any file, including ones HEAD would happily size — minor, standard, but combined with the oracles it maps the store.

---

## 🔵 Low severity / code quality / docs

1. **TypeScript does not compile** ✅ — `npx tsc --noEmit`: `index.ts:153` arithmetic on `context.after`, `index.ts:408/415/416` `'error' is of type 'unknown'`. There is no `typecheck`/`test`/`lint` script (`package.json:6-9` only `dev`/`start`), no tests, no CI — the H2 NaN bug is exactly what the ignored compiler error was pointing at. Two `(request.params as any)` casts (`index.ts:218,251`) defeat the "fully typed" claim.
2. **Dead code/config/deps:** unused `import staticFiles` (`index.ts:5`, see H5), unused `isCompressible()` (`index.ts:45-60`), unused `pino` dep, whole `compression` config (`config.ts:74-78,159-163`) — README/PROJECT_SUMMARY advertise gzip/Brotli that **does not exist** (verified: `Accept-Encoding: gzip, br` → no `Content-Encoding`, no `Vary`); Cloudflare *may* compress in front, direct origin traffic gets identity bytes. Dead `security.enabled`, `enforceHTTPS`, `banDuration`, `redis: undefined` placeholder (`index.ts:141`).
3. **Reinvents `@fastify/static` badly.** A maintained plugin (already in deps!) implements ranges, ETags, dotfiles, and traversal safely; the 200-line hand-rolled version (`index.ts:215-379`) is the source of C1–C3, H1, M1, M7. `buildServer()` also *starts listening* and calls `process.exit`, exports nothing, and auto-runs on import (`index.ts:435-438`) — untestable by construction.
4. **Fake fixtures & stale docs:** `public/music/test-audio.mp3` is **512,000 zero bytes** (not audio — players/CDN probes fail; STREAMING.md's "tested ✅" curl claims can't be reproduced with it). `public/photos/` referenced in docs doesn't exist. README's Dockerfile `COPY package.json bun.lockb` references the old binary lockfile name (repo has text `bun.lock`) and no Dockerfile exists in-repo; PROJECT_SUMMARY's tree shows `mini-services/cdn-server/`, `.env`, `cdn.log` — none present. Docs claim compression, Redis, IP *banning*, and `X-XSS-Protection` that the code doesn't implement (H2/M3/#2).
5. **Runtime lock-in without declaration:** `import './config.js'` + `moduleResolution: bundler` + `noEmit` only works under Bun/tsx — plain Node type-stripping fails (`Cannot find module …/config.js`, verified). No `engines`/Bun version pinned, `.env` loading is Bun-only magic (H6), yet README presents Node-style/systemd/Docker flows interchangeably.
6. **Config/code smells:** version string duplicated (`index.ts:258` vs package.json); magic `3600` fallback; `cache: 10000` magic number; `errorResponseBuilder` returns a nonstandard `{code:…}` body shape inconsistent with every other error body (`{error,message}` with HTTP-meaningless duplication); inconsistent manual security headers only on one code path (M3); GET and HEAD handlers copy-pasted.
7. **Header trivia:** `Keep-Alive: timeout=72` (Node default) with no documented tuning; HSTS `preload` should not be sent before the domain is preload-ready/HTTPS-only (M3); 304/416 bodies from Fastify vs hand-rolled JSON differ in shape; CORS `exposedHeaders` omits `ETag` case-consistently—fine—but `allowedHeaders` omits `If-Range`, so browser `fetch` with `If-Range` preflights fail (compounds M1).
8. **`.gitignore` gaps/oddities:** ignores `package-lock.json`/`yarn.lock` while shipping `bun.lock` (fine) but also ignores nothing for audit scratch; `.env.example` instructs `cp .env.example .env` with `NODE_ENV=production` + empty `CDN_ROOT_DIR` (M6).
9. **Accessibility/UX of ops:** startup logs print `http://0.0.0.0:3005` (not a browsable URL), root JSON message is the only "landing page", and there is no `/robots`-style guard — search engines can index the whole tree (it's a public CDN by design; worth an explicit decision, currently accidental).
10. **Minor verified behaviours (for the regression suite):** uppercase blocked extensions are blocked; `%00` returns 404 (no crash); overlong UTF-8 `..%c0%af` returns Fastify 400; double-encoded traversal 404s; backslash traversal 404s on Linux (would need review on Windows, where `\` is a separator and `safePath`'s guarantees differ); empty file GET 200 / range 416 are correct.

---

## What is actually OK
- Plain `../` and encoded `../` to non-prefix paths are rejected (403); router uses `caseSensitive: true`; Fastify's URL validation rejects overlong encodings.
- Rate limiting *does* count and trigger (just with the wrong status/body, H2); Helmet baseline headers, `nosniff` on 200s, CORS preflight (204) work.
- Streaming happy path works: `bytes=0-4`/`5-`/`0-20` → correct 206/Content-Range; exact-match ETag → 304; health route is reachable (static-over-wildcard precedence).
- Streaming uses `createReadStream` rather than buffering whole files; 404s set `no-store`.

## Recommended remediation order
1. **Today (stop the bleeding):** take it off the public internet or put it behind Cloudflare *with origin lockdown*; deny dotfiles; switch to a default-deny extension allowlist; treat the three escapes (C1–C3) as one fix — replace the hand-rolled sender with `@fastify/static` (upgraded to ≥10.1.8) configured with `dotfiles:'deny'`, no symlink following, and realpath containment, **or** fix `safePath` with `path.relative` + `fs.realpath` re-validation.
2. **This week:** rewrite Range parsing (strict, clamped, suffix + 416 rules) or delete it and let the plugin/Cloudflare do it; fix `errorResponseBuilder` to produce a real 429 (return an `Error` with `statusCode`, parse `context.after` as the string it is); restrict `trustProxy` to Cloudflare's published IP ranges (or `false` + explicit proxy config); stop leaking `message`/`stack`; make `/health` minimal (`{"status":"ok"}`) and exclude it from rate limiting; enable CSP/`sandbox` for served content and serve from a cookie-less domain.
3. **Then:** `structuredClone` the config + validate env with a schema (port range, log-level enum, CORS origin list); single async `stat` via the opened file handle (`fstat`), stream error handlers, `SIGTERM`/`SIGINT` → `fastify.close()`; server timeouts + per-IP concurrency/byte budgets; `npm audit fix` (drop or upgrade `@fastify/static`, move `pino-pretty` to devDeps); make `tsc --noEmit` pass and gate it in CI with real tests (the ✅ cases above are a ready-made regression list — every PoC in this file should become a test).
4. **Docs honesty pass:** remove or implement compression/Redis/banning/file-logging claims, replace the zero-byte MP3 with a real fixture, fix the Dockerfile lockfile name, and delete "production-ready" until 1–3 land.

*Audit workspace note: reproduction fixtures lived outside the repo in `/tmp/cdn-audit/`; `node_modules/` and `package-lock.json` created during testing are gitignored and were removed afterward — `git status` is clean apart from this report.*
