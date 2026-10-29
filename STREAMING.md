# Streaming (HTTP Range)

Implemented in `src/lib/range.ts` + `src/lib/serve.ts` and covered by tests:

- **Single ranges** `bytes=a-b`, open-ended `bytes=a-`, and **suffix ranges** `bytes=-N` (media-player seeks).
- **Clamping:** an over-long end is clamped to the file size, so `Content-Length` always matches the bytes sent — no hung sockets.
- **416, never 500,** for garbage units, NaN bait, inverted ranges, and multi-range requests (`Content-Range: bytes */<size>` included).
- **Conditionals first:** `If-None-Match` (exact/weak/list/`*`) → 304 before any range work; `If-Range` (ETag or date) gates partial responses — stale validators get the full 200 body.
- **Resource-safe:** streams come from an open file handle, are capped by `CDN_MAX_STREAMS`, and are destroyed when the client disconnects.

Try it:
```bash
curl -H 'Range: bytes=-1000' https://cdn.celestialb.cv/music/test-tone.wav -o tail.wav
curl -C - -O https://cdn.celestialb.cv/dl/big/2.0.0/big.tar.gz
```
