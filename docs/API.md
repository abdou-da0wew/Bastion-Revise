# API & the `/dl/` registry

Base URL in production: `https://cdn.celestialb.cv`

## Concepts

- **Packages** live at `packages/<name>/<version>/<file>` with a per-package `manifest.json` tracking size/SHA-256/upload time and the `latest` pointer.
- **Pinned versions are immutable by convention**: publish fixes under a new version; pinned URLs get `Cache-Control: …31536000, immutable`. `latest` gets a 5-minute cache.
- Everything under `/dl/` is served as an **attachment** with `nosniff` and the manifest SHA-256 as its ETag — safe for executables & scripts.

## Authentication

`Authorization: Bearer <token>` (or `X-Api-Token: <token>`).

| Scope | Can do |
|---|---|
| `read` | list files, read metrics |
| `upload` | `PUT` new package files |
| `manage` | delete files/versions/packages, set `latest`, + read |
| `admin` | everything, incl. token management |

`CDN_ADMIN_TOKEN` (env) is a bootstrap **admin** that always works and is never stored on disk. Tokens created via the API are stored **only as SHA-256 hashes** in `data/tokens.json`; the plaintext is returned exactly once.

## Token lifecycle

```bash
ADMIN="Authorization: Bearer $CDN_ADMIN_TOKEN"

# create (save the returned token — it is shown once)
curl -s -X POST $BASE/api/tokens -H "$ADMIN" -H 'content-type: application/json' \
  -d '{"label":"github-ci","scopes":["upload","read"]}'

# list (hashes/prefixes only — never plaintext)
curl -s $BASE/api/tokens -H "$ADMIN"

# revoke (id from list) — DELETE or POST …/revoke
curl -s -X POST $BASE/api/tokens/<id>/revoke -H "$ADMIN"
curl -s -X DELETE $BASE/api/tokens/<id> -H "$ADMIN"
```

## Files

```bash
# upload (streaming, raw body; verified & hashed server-side) → 201 {sha256, url, latestUrl}
curl -X PUT $BASE/api/files/mytool/1.2.3/mytool-linux-x64 \
  -H "Authorization: Bearer $TOKEN" -H 'content-type: application/octet-stream' \
  --data-binary @./mytool-linux-x64
# …or use scripts/publish.sh mytool 1.2.3 ./mytool-linux-x64

# list everything
curl -s $BASE/api/files -H "Authorization: Bearer $TOKEN"

# public registry browsing (no auth)
curl -s $BASE/dl
curl -s $BASE/dl/mytool
curl -s $BASE/dl/mytool/1.2.3

# pin `latest`
curl -s -X POST $BASE/api/files/mytool/1.2.3/latest -H "Authorization: Bearer $MANAGE_TOKEN"

# delete a file / a version / a whole package (manage scope)
curl -X DELETE $BASE/api/files/mytool/1.2.3/mytool-linux-x64 -H "Authorization: Bearer $MANAGE_TOKEN"
curl -X DELETE $BASE/api/files/mytool/1.2.3 -H "Authorization: Bearer $MANAGE_TOKEN"
curl -X DELETE $BASE/api/files/mytool -H "Authorization: Bearer $MANAGE_TOKEN"
```

**Direct disk placement also works:** copy files into `packages/<name>/<version>/`
and either upload once via the API (to build the manifest) or write `manifest.json`
yourself:

```json
{ "name": "mytool", "latest": "1.2.3",
  "versions": { "1.2.3": { "createdAt": "2026-10-29T00:00:00.000Z",
    "files": { "mytool-linux-x64": { "size": 12345, "sha256": "<hex>", "contentType": null, "uploadedAt": "2026-10-29T00:00:00.000Z" } } } } }
```

Files without a manifest entry still serve (ETag falls back to size+mtime), so
disk drops are never broken — the manifest just unlocks SHA-256 validation.

## Downloading

```bash
curl -O  $BASE/dl/mytool/1.2.3/mytool-linux-x64      # pinned (immutable)
curl -O  $BASE/dl/mytool/latest/mytool-linux-x64     # floating
curl -C- -O $BASE/dl/big/2.0.0/big.tar.gz            # resumable (Range)
sha256sum mytool-linux-x64                           # compare with GET /dl/mytool/1.2.3
```

Allowed registry types are configurable (`CDN_PACKAGE_EXTENSIONS`); secrets
(`.env`, `.pem`, `.key`, `.p12`, `.pfx`) are hard-blocked. Version `latest`
cannot be uploaded to — it's an alias, managed via upload order or the
`POST …/latest` endpoint.
